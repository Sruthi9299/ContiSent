from typing import Dict, Any
import logging
import uuid
import yaml
import tempfile
import os
import concurrent.futures
from app.api.deps import SessionLocal
from app.models.domain import Submission, SubmissionStatus, ScanResult, PolicyDecision, PolicyDecisionEnum
from app.services.scanner import run_trivy_scan, run_syft_scan, run_syft_scan_on_url, is_git_repo, run_website_dast_scan, run_checkov_scan_on_url, run_kube_bench_scan
# pyrefly: ignore [missing-import]
from kubernetes import client, config, utils

logger = logging.getLogger(__name__)

class OrchestratorService:
    """
    Orchestrator service that manages the core scanning pipeline.
    """
    
    @staticmethod
    def process_submission(submission_id: int):
        """
        Background task to process a submission.
        """
        db = SessionLocal()
        try:
            submission = db.query(Submission).filter(Submission.id == submission_id).first()
            if not submission:
                logger.error(f"Submission {submission_id} not found.")
                return

            # Update status to SCANNING - use transaction
            try:
                submission.status = SubmissionStatus.SCANNING
                db.commit()
            except Exception as e:
                logger.error(f"Failed to update submission status to SCANNING: {e}")
                db.rollback()
                return

            target = submission.source_uri

            # Run Scans
            logger.info(f"Running scans for {target} of type {submission.type}")
            
            syft_result = {}
            trivy_result = {}
            checkov_result = {}
            kube_bench_result = {}
            
            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    futures = {}
                    if submission.type and submission.type.lower() == "url":
                        if is_git_repo(target):
                            logger.info("Target is a Git Repository, running SAST/SCA")
                            futures['trivy'] = executor.submit(run_trivy_scan, target, "repo")
                            futures['syft'] = executor.submit(run_syft_scan_on_url, target)
                            futures['checkov'] = executor.submit(run_checkov_scan_on_url, target)
                        else:
                            logger.info("Target is NOT a Git repository. Treating as a live website (DAST).")
                            futures['trivy'] = executor.submit(run_website_dast_scan, target)
                    else:
                        logger.info("Target is an Image, running container scans")
                        futures['trivy'] = executor.submit(run_trivy_scan, target, "image")
                        # Prefix with registry: to pull without needing a local Docker daemon
                        futures['syft'] = executor.submit(run_syft_scan, f"registry:{target}")

                    for name, future in futures.items():
                        try:
                            if name == 'trivy':
                                trivy_result = future.result()
                            elif name == 'syft':
                                syft_result = future.result()
                            elif name == 'checkov':
                                checkov_result = future.result()
                        except Exception as e:
                            logger.error(f"{name} scan failed for {target}: {e}")
                            raise
            except Exception as e:
                logger.error(f"Scan failed for submission {submission_id}: {e}")
                submission.status = SubmissionStatus.FAILED
                db.commit()
                return

            # Process Trivy result
            critical = 0
            high = 0
            medium = 0
            low = 0

            policy = submission.policy_profile
            whitelisted_cves = policy.whitelisted_cves if policy and policy.whitelisted_cves else []

            results = trivy_result.get("Results", [])
            for result in results:
                vulnerabilities = result.get("Vulnerabilities", [])
                for v in vulnerabilities:
                    vuln_id = v.get("VulnerabilityID", "")
                    if vuln_id in whitelisted_cves:
                        logger.info(f"Ignoring whitelisted CVE: {vuln_id}")
                        continue
                        
                    severity = v.get("Severity", "").upper()
                    if severity == "CRITICAL":
                        critical += 1
                    elif severity == "HIGH":
                        high += 1
                    elif severity == "MEDIUM":
                        medium += 1
                    elif severity == "LOW":
                        low += 1

            # Update status to POLICY_EVALUATION
            submission.status = SubmissionStatus.POLICY_EVALUATION
            db.commit()

            # Create ScanResult
            scan_result = ScanResult(
                submission_id=submission_id,
                status="success",
                critical_count=critical,
                high_count=high,
                medium_count=medium,
                low_count=low,
                full_json=trivy_result,
                sbom_json=syft_result,
                iac_json=checkov_result,
                k8s_json=kube_bench_result
            )
            db.add(scan_result)

            # Evaluate Policy
            decision = PolicyDecisionEnum.PASS
            reason = "Scan passed successfully."
            
            max_crit = policy.max_critical if policy else 0
            max_hi = policy.max_high if policy else 10
            
            if critical > max_crit:
                decision = PolicyDecisionEnum.FAIL
                reason = f"Failed policy: found {critical} critical vulnerabilities (max allowed: {max_crit})."
            elif high > max_hi:
                decision = PolicyDecisionEnum.FAIL
                reason = f"Failed policy: found {high} high vulnerabilities (max allowed: {max_hi})."
            
            policy_decision = PolicyDecision(
                submission_id=submission_id,
                decision=decision,
                reason=reason
            )
            db.add(policy_decision)

            # Update Submission Status
            if decision == PolicyDecisionEnum.FAIL:
                submission.status = SubmissionStatus.QUARANTINED
            else:
                # Generate Kubernetes Deployment Manifests
                submission.status = SubmissionStatus.DEPLOYING
                db.commit()
                
                from app.models.domain import Deployment, DeploymentStatus
                
                # Use UUID to avoid collisions
                safe_name = f"app-{uuid.uuid4().hex[:12]}"
                image_name = target if submission.type and submission.type.lower() == "image" else "nginxinc/nginx-unprivileged:alpine"
                container_port = 80 if submission.type and submission.type.lower() == "image" else 8080
                
                dep_config = submission.deployment_config
                namespace = dep_config.namespace if dep_config else "default"
                replicas = dep_config.replicas if dep_config else 3
                cpu_limit = dep_config.cpu_limit if dep_config else "500m"
                memory_limit = dep_config.memory_limit if dep_config else "512Mi"
                enable_redis = dep_config.enable_redis if dep_config else False
                enable_postgres = dep_config.enable_postgres if dep_config else False
                ingress_host = dep_config.ingress_host if dep_config else None
                
                manifests = []
                
                deployment_manifest = {
                    "apiVersion": "apps/v1",
                    "kind": "Deployment",
                    "metadata": {
                        "name": safe_name,
                        "namespace": namespace
                    },
                    "spec": {
                        "replicas": replicas,
                        "selector": {
                            "matchLabels": {
                                "app": safe_name
                            }
                        },
                        "template": {
                            "metadata": {
                                "labels": {
                                    "app": safe_name
                                }
                            },
                            "spec": {
                                "containers": [
                                    {
                                        "name": "web",
                                        "image": image_name,
                                        "ports": [{"containerPort": container_port}],
                                        "resources": {
                                            "limits": {
                                                "memory": memory_limit,
                                                "cpu": cpu_limit
                                            },
                                            "requests": {
                                                "memory": "256Mi",
                                                "cpu": "250m"
                                            }
                                        },
                                        "securityContext": {
                                            "runAsNonRoot": True,
                                            "allowPrivilegeEscalation": False,
                                            "readOnlyRootFilesystem": False
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
                manifests.append(deployment_manifest)
                
                service_manifest = {
                    "apiVersion": "v1",
                    "kind": "Service",
                    "metadata": {
                        "name": f"{safe_name}-svc",
                        "namespace": namespace
                    },
                    "spec": {
                        "selector": {
                            "app": safe_name
                        },
                        "ports": [
                            {"protocol": "TCP", "port": 80, "targetPort": container_port}
                        ],
                        "type": "NodePort"
                    }
                }
                manifests.append(service_manifest)
                
                if enable_redis:
                    redis_pvc = {
                        "apiVersion": "v1",
                        "kind": "PersistentVolumeClaim",
                        "metadata": {"name": f"{safe_name}-redis-pvc", "namespace": namespace},
                        "spec": {
                            "accessModes": ["ReadWriteOnce"],
                            "resources": {"requests": {"storage": "1Gi"}}
                        }
                    }
                    redis_dep = {
                        "apiVersion": "apps/v1",
                        "kind": "Deployment",
                        "metadata": {"name": f"{safe_name}-redis", "namespace": namespace},
                        "spec": {
                            "replicas": 1,
                            "selector": {"matchLabels": {"app": f"{safe_name}-redis"}},
                            "template": {
                                "metadata": {"labels": {"app": f"{safe_name}-redis"}},
                                "spec": {
                                    "containers": [{
                                        "name": "redis", 
                                        "image": "redis:alpine", 
                                        "ports": [{"containerPort": 6379}],
                                        "volumeMounts": [{"name": "data", "mountPath": "/data"}]
                                    }],
                                    "volumes": [{"name": "data", "persistentVolumeClaim": {"claimName": f"{safe_name}-redis-pvc"}}]
                                }
                            }
                        }
                    }
                    redis_svc = {
                        "apiVersion": "v1",
                        "kind": "Service",
                        "metadata": {"name": f"{safe_name}-redis", "namespace": namespace},
                        "spec": {"selector": {"app": f"{safe_name}-redis"}, "ports": [{"port": 6379}]}
                    }
                    manifests.extend([redis_pvc, redis_dep, redis_svc])

                if enable_postgres:
                    import base64
                    pg_secret = {
                        "apiVersion": "v1",
                        "kind": "Secret",
                        "metadata": {"name": f"{safe_name}-pg-secret", "namespace": namespace},
                        "type": "Opaque",
                        "data": {
                            "POSTGRES_USER": base64.b64encode(b"postgres").decode("utf-8"),
                            "POSTGRES_PASSWORD": base64.b64encode(b"securepassword123").decode("utf-8")
                        }
                    }
                    pg_pvc = {
                        "apiVersion": "v1",
                        "kind": "PersistentVolumeClaim",
                        "metadata": {"name": f"{safe_name}-pg-pvc", "namespace": namespace},
                        "spec": {
                            "accessModes": ["ReadWriteOnce"],
                            "resources": {"requests": {"storage": "5Gi"}}
                        }
                    }
                    pg_dep = {
                        "apiVersion": "apps/v1",
                        "kind": "Deployment",
                        "metadata": {"name": f"{safe_name}-postgres", "namespace": namespace},
                        "spec": {
                            "replicas": 1,
                            "selector": {"matchLabels": {"app": f"{safe_name}-postgres"}},
                            "template": {
                                "metadata": {"labels": {"app": f"{safe_name}-postgres"}},
                                "spec": {
                                    "containers": [
                                        {
                                            "name": "postgres", 
                                            "image": "postgres:13-alpine", 
                                            "ports": [{"containerPort": 5432}],
                                            "envFrom": [{"secretRef": {"name": f"{safe_name}-pg-secret"}}],
                                            "volumeMounts": [{"name": "pgdata", "mountPath": "/var/lib/postgresql/data"}]
                                        }
                                    ],
                                    "volumes": [{"name": "pgdata", "persistentVolumeClaim": {"claimName": f"{safe_name}-pg-pvc"}}]
                                }
                            }
                        }
                    }
                    pg_svc = {
                        "apiVersion": "v1",
                        "kind": "Service",
                        "metadata": {"name": f"{safe_name}-postgres", "namespace": namespace},
                        "spec": {"selector": {"app": f"{safe_name}-postgres"}, "ports": [{"port": 5432}]}
                    }
                    manifests.extend([pg_secret, pg_pvc, pg_dep, pg_svc])

                if ingress_host:
                    ingress_manifest = {
                        "apiVersion": "networking.k8s.io/v1",
                        "kind": "Ingress",
                        "metadata": {"name": f"{safe_name}-ingress", "namespace": namespace},
                        "spec": {
                            "rules": [{
                                "host": ingress_host,
                                "http": {
                                    "paths": [{
                                        "path": "/",
                                        "pathType": "Prefix",
                                        "backend": {
                                            "service": {
                                                "name": f"{safe_name}-svc",
                                                "port": {"number": 80}
                                            }
                                        }
                                    }]
                                }
                            }]
                        }
                    }
                    manifests.append(ingress_manifest)

                network_policy = {
                    "apiVersion": "networking.k8s.io/v1",
                    "kind": "NetworkPolicy",
                    "metadata": {"name": f"{safe_name}-deny-all", "namespace": namespace},
                    "spec": {
                        "podSelector": {},
                        "policyTypes": ["Ingress"],
                        "ingress": [{
                            "from": [{"namespaceSelector": {"matchLabels": {"kubernetes.io/metadata.name": "ingress-nginx"}}}]
                        }]
                    }
                }
                manifests.append(network_policy)

                deploy_dir = "/app/generated_deployments"
                os.makedirs(deploy_dir, exist_ok=True)
                
                yaml_path = os.path.join(deploy_dir, f"{safe_name}.yaml")
                try:
                    with open(yaml_path, "w") as f:
                        yaml.safe_dump_all(manifests, f)
                    
                    logger.info(f"Kubernetes Deployment Manifest generated at {yaml_path}")
                except Exception as e:
                    logger.error(f"Failed to generate YAML manifest: {e}")
                    submission.status = SubmissionStatus.FAILED
                    db.commit()
                    return
                
                # Execute True Kubernetes Deployment using python-kubernetes
                try:
                    logger.info(f"Deploying {safe_name} to True Kubernetes Cluster in namespace {namespace}")
                    
                    k8s_mode = os.environ.get("K8S_DEPLOY_MODE", "local")
                    
                    if k8s_mode == "in-cluster":
                        config.load_incluster_config()
                    else:
                        # Read the kubeconfig from the mounted volume
                        kubeconfig_path = "/home/appuser/.kube/config"
                        if not os.path.exists(kubeconfig_path):
                             # fallback for local development if not in container
                             kubeconfig_path = os.path.expanduser("~/.kube/config")
                             
                        with open(kubeconfig_path, 'r') as f:
                            kube_config = yaml.safe_load(f)
                            
                        # Modify the server URL to point to host.docker.internal instead of 127.0.0.1
                        for cluster in kube_config.get('clusters', []):
                            server = cluster['cluster']['server']
                            if '127.0.0.1' in server or 'kubernetes.docker.internal' in server:
                                cluster['cluster']['server'] = server.replace('127.0.0.1', 'host.docker.internal').replace('kubernetes.docker.internal', 'host.docker.internal')
                            # Disable TLS verification due to hostname mismatch
                            cluster['cluster']['insecure-skip-tls-verify'] = True
                            if 'certificate-authority-data' in cluster['cluster']:
                                del cluster['cluster']['certificate-authority-data']
                            if 'certificate-authority' in cluster['cluster']:
                                del cluster['cluster']['certificate-authority']
                                
                        # Fix Windows paths for minikube certificates
                        import re
                        for user in kube_config.get('users', []):
                            u = user.get('user', {})
                            for key in ['client-certificate', 'client-key']:
                                if key in u and isinstance(u[key], str):
                                    # Translate C:\Users\name\.minikube\... to /home/appuser/.minikube/...
                                    u[key] = re.sub(r'^[a-zA-Z]:\\Users\\[^\\]+\\.minikube', '/home/appuser/.minikube', u[key]).replace('\\', '/')
                                
                        # Save the modified kubeconfig
                        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
                            yaml.dump(kube_config, f)
                            temp_config_path = f.name
                            
                        # Load the config and apply the YAML
                        config.load_kube_config(config_file=temp_config_path)
                        
                    k8s_client = client.ApiClient()
                    utils.create_from_yaml(k8s_client, yaml_path)
                    
                    # Fetch the assigned NodePort
                    core_v1 = client.CoreV1Api(k8s_client)
                    svc = core_v1.read_namespaced_service(name=f"{safe_name}-svc", namespace=namespace)
                    node_port = svc.spec.ports[0].node_port
                    
                    # Determine Node IP dynamically instead of hardcoding localhost
                    node_ip = "localhost"
                    try:
                        nodes = core_v1.list_node()
                        if nodes.items:
                            for address in nodes.items[0].status.addresses:
                                if address.type == "InternalIP":
                                    node_ip = address.address
                                    break
                    except Exception as e:
                        logger.warning(f"Could not fetch node IP, falling back to localhost: {e}")
                        
                    if submission.type and submission.type.lower() == "url":
                        access_url = target
                    else:
                        access_url = f"http://{node_ip}:{node_port}"
                    
                    logger.info(f"Successfully deployed {safe_name} to Kubernetes! Available at {access_url}")
                    
                    # Actual deployment success
                    deployment = Deployment(
                        submission_id=submission_id,
                        namespace=namespace,
                        cluster="in-cluster" if k8s_mode == "in-cluster" else "docker-desktop-kubernetes",
                        status=DeploymentStatus.SUCCEEDED,
                        access_url=access_url
                    )
                    db.add(deployment)
                    submission.status = SubmissionStatus.COMPLETED
                    db.commit()

                    try:
                        logger.info("Running post-deployment Kube-bench scan...")
                        kube_bench_res = run_kube_bench_scan()
                        db_scan_result = db.query(ScanResult).filter(ScanResult.submission_id == submission_id).first()
                        if db_scan_result:
                            db_scan_result.k8s_json = kube_bench_res
                    except Exception as e:
                        logger.warning(f"Kube-bench scan failed: {e}")

                except Exception as e:
                    logger.error(f"Kubernetes deployment failed: {e}")
                    # Create a FAILED deployment record so it shows up in UI
                    deployment = Deployment(
                        submission_id=submission_id,
                        namespace=namespace,
                        cluster="in-cluster" if k8s_mode == "in-cluster" else "docker-desktop-kubernetes",
                        status=DeploymentStatus.FAILED,
                        access_url=None
                    )
                    db.add(deployment)
                    # Mark as COMPLETED so the user can still see the scan results
                    submission.status = SubmissionStatus.COMPLETED
                    db.commit()

            db.commit()
            logger.info(f"Submission {submission_id} processed successfully.")

        except Exception as e:
            logger.error(f"Error processing submission {submission_id}: {e}", exc_info=True)
            if 'submission' in locals():
                try:
                    submission.status = SubmissionStatus.FAILED
                    db.commit()
                except Exception as rollback_err:
                    logger.error(f"Failed to rollback: {rollback_err}")
        finally:
            db.close()
