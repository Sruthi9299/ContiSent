from typing import Dict, Any
import logging
import uuid
import yaml
from app.api.deps import SessionLocal
from app.models.domain import Submission, SubmissionStatus, ScanResult, PolicyDecision, PolicyDecisionEnum
from app.services.scanner import run_trivy_scan, run_syft_scan, run_syft_scan_on_url, is_git_repo, run_website_dast_scan, run_checkov_scan_on_url, run_kube_bench_scan
import tempfile
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
                if submission.type == "url":
                    if is_git_repo(target):
                        logger.info("Target is a Git Repository, running SAST/SCA")
                        trivy_result = run_trivy_scan(target, target_type="repo")
                        try:
                            syft_result = run_syft_scan_on_url(target)
                        except Exception as e:
                            logger.warning(f"Syft scan on URL failed for {target}, ignoring for MVP: {e}")
                        try:
                            checkov_result = run_checkov_scan_on_url(target)
                        except Exception as e:
                            logger.warning(f"Checkov scan on URL failed for {target}: {e}")
                    else:
                        logger.info("Target is NOT a Git repository. Treating as a live website (DAST).")
                        trivy_result = run_website_dast_scan(target)
                        # Live websites do not yield SBOMs in our MVP
                        syft_result = {}
                else:
                    logger.info("Target is an Image, running container scans")
                    trivy_result = run_trivy_scan(target, target_type="image")
                    try:
                        syft_result = run_syft_scan(target)
                    except Exception as e:
                        logger.warning(f"Syft scan failed for {target}, ignoring for MVP: {e}")
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

            results = trivy_result.get("Results", [])
            for result in results:
                vulnerabilities = result.get("Vulnerabilities", [])
                for v in vulnerabilities:
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
            if critical > 0:
                decision = PolicyDecisionEnum.FAIL
                reason = f"Failed policy: found {critical} critical vulnerabilities."
            
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
                import os
                import subprocess
                
                # Use UUID to avoid collisions
                safe_name = f"app-{uuid.uuid4().hex[:12]}"
                image_name = target if submission.type == "image" else "nginxinc/nginx-unprivileged:alpine"
                
                deployment_manifest = {
                    "apiVersion": "apps/v1",
                    "kind": "Deployment",
                    "metadata": {
                        "name": safe_name,
                        "namespace": "default"
                    },
                    "spec": {
                        "replicas": 3,
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
                                        "ports": [{"containerPort": 80}],
                                        "resources": {
                                            "limits": {
                                                "memory": "512Mi",
                                                "cpu": "500m"
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
                
                service_manifest = {
                    "apiVersion": "v1",
                    "kind": "Service",
                    "metadata": {
                        "name": f"{safe_name}-svc",
                        "namespace": "default"
                    },
                    "spec": {
                        "selector": {
                            "app": safe_name
                        },
                        "ports": [
                            {"protocol": "TCP", "port": 80, "targetPort": 80}
                        ],
                        "type": "NodePort"
                    }
                }
                
                deploy_dir = "/app/generated_deployments"
                os.makedirs(deploy_dir, exist_ok=True)
                
                yaml_path = os.path.join(deploy_dir, f"{safe_name}.yaml")
                try:
                    with open(yaml_path, "w") as f:
                        yaml.safe_dump_all([deployment_manifest, service_manifest], f)
                    
                    logger.info(f"Kubernetes Deployment Manifest generated at {yaml_path}")
                except Exception as e:
                    logger.error(f"Failed to generate YAML manifest: {e}")
                    submission.status = SubmissionStatus.FAILED
                    db.commit()
                    return
                
                # Execute True Kubernetes Deployment using python-kubernetes
                try:
                    logger.info(f"Deploying {safe_name} to True Kubernetes Cluster")
                    
                    # Read the kubeconfig from the mounted volume
                    kubeconfig_path = "/home/appuser/.kube/config"
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
                    svc = core_v1.read_namespaced_service(name=f"{safe_name}-svc", namespace="default")
                    node_port = svc.spec.ports[0].node_port
                    access_url = f"http://localhost:{node_port}"
                    
                    logger.info(f"Successfully deployed {safe_name} to Kubernetes! Available at {access_url}")
                    
                    # Actual deployment success
                    deployment = Deployment(
                        submission_id=submission_id,
                        namespace="default",
                        cluster="docker-desktop-kubernetes",
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
                        namespace="default",
                        cluster="docker-desktop-kubernetes",
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
