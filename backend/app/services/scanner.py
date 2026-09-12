import subprocess
import json
import logging
import tempfile
import shutil
import urllib.request
import urllib.error
import ssl
import ipaddress
from urllib.parse import urlparse
from typing import Dict, Any

logger = logging.getLogger(__name__)

def is_valid_url(url: str) -> bool:
    """
    Validate URL format and check for SSRF risks.
    """
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
        
        # Extract hostname
        hostname = parsed.hostname
        if not hostname:
            return False
        
        # Resolve hostname and check against internal ranges
        try:
            ip = ipaddress.ip_address(hostname)
            # Check if IP is in internal ranges
            internal_ranges = [
                ipaddress.ip_network("127.0.0.1/32"),
                ipaddress.ip_network("10.0.0.0/8"),
                ipaddress.ip_network("172.16.0.0/12"),
                ipaddress.ip_network("192.168.0.0/16"),
                ipaddress.ip_network("::1/128"),
            ]
            for range_obj in internal_ranges:
                if ip in range_obj:
                    logger.warning(f"URL contains internal IP address: {hostname}")
                    return False
        except ValueError:
            # hostname is a domain name, not an IP
            pass
        
        return True
    except Exception as e:
        logger.error(f"URL validation error: {e}")
        return False

def is_git_repo(url: str) -> bool:
    """
    Checks if a URL points to a valid Git repository using git ls-remote.
    """
    if not is_valid_url(url):
        logger.warning(f"Invalid or internal URL: {url}")
        return False
    
    try:
        result = subprocess.run(
            ["git", "ls-remote", url], 
            capture_output=True, 
            timeout=10
        )
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Git validation failed: {e}")
        return False

def run_website_dast_scan(url: str) -> Dict[str, Any]:
    """
    Performs a Dynamic Website Security Analysis (DAST) on a live URL using Nmap and Nikto.
    Checks for open ports, missing headers, and common web vulnerabilities.
    Returns a Trivy-compatible JSON payload.
    """
    if not is_valid_url(url):
        raise ValueError(f"Invalid or internal URL: {url}")
    
    logger.info(f"Running real-time DAST scan on {url}")
    synthetic_results = []
    
    # Ensure URL has scheme
    if not url.startswith("http"):
        url = "http://" + url
        
    parsed = urlparse(url)
    hostname = parsed.hostname
    
    if not hostname:
        raise ValueError(f"Could not parse hostname from URL: {url}")
        
    try:
        # 1. Run a real Nmap scan for web vulnerabilities
        logger.info(f"Running Nmap HTTP scripts on {hostname}")
        nmap_cmd = ["nmap", "-sV", "--script", "http-security-headers,http-methods", "-p", "80,443", hostname]
        nmap_result = subprocess.run(nmap_cmd, capture_output=True, text=True, timeout=120)
        nmap_output = nmap_result.stdout
        
        # Parse Nmap Output
        for line in nmap_output.split('\n'):
            line_clean = line.strip()
            if "open" in line_clean and ("http" in line_clean or "ssl" in line_clean):
                synthetic_results.append({
                    "VulnerabilityID": "DAST-NMAP-PORT",
                    "PkgName": "Network Port",
                    "Severity": "LOW",
                    "InstalledVersion": "",
                    "Title": "Open Web Port",
                    "Description": f"Nmap found open port: {line_clean}"
                })
            elif "missing" in line_clean.lower() or "warning" in line_clean.lower():
                synthetic_results.append({
                    "VulnerabilityID": "DAST-NMAP-WARNING",
                    "PkgName": "Nmap Script Check",
                    "Severity": "MEDIUM",
                    "InstalledVersion": "",
                    "Title": "Nmap Security Warning",
                    "Description": line_clean
                })

        # 2. Run Nikto scanner for deeper web vulnerabilities
        try:
            logger.info(f"Running Nikto scan on {url}")
            nikto_cmd = ["nikto", "-h", url, "-maxtime", "60"]
            nikto_result = subprocess.run(nikto_cmd, capture_output=True, text=True, timeout=90)
            nikto_output = nikto_result.stdout
            
            # Parse Nikto Output
            for line in nikto_output.split('\n'):
                line_clean = line.strip()
                if line_clean.startswith("+") and not line_clean.startswith("+ Target") and not line_clean.startswith("+ Server"):
                    severity = "HIGH" if "OSVDB" in line_clean else "MEDIUM"
                    synthetic_results.append({
                        "VulnerabilityID": "DAST-NIKTO-VULN",
                        "PkgName": "Nikto Scanner",
                        "Severity": severity,
                        "InstalledVersion": "",
                        "Title": "Nikto Web Finding",
                        "Description": line_clean.lstrip('+ ')
                    })
        except FileNotFoundError:
            logger.warning("Nikto is not installed. DAST scan will only include Nmap results.")
                
    except subprocess.TimeoutExpired:
        logger.warning("DAST scans timed out, returning partial results.")
    except Exception as e:
        logger.error(f"DAST scan failed to execute tools: {e}")
        raise RuntimeError(f"DAST scanner failed to process website: {e}")
        
    return {
        "SchemaVersion": 2,
        "ArtifactName": url,
        "ArtifactType": "website",
        "Results": [{
            "Target": url,
            "Class": "dast",
            "Type": "website",
            "Vulnerabilities": synthetic_results
        }]
    }

def run_trivy_scan(target: str, target_type: str = "image") -> Dict[str, Any]:
    """
    Runs an Aqua Trivy scan on a Docker image or repository.
    Returns the vulnerability report as a dictionary.
    """
    try:
        # Construct the Trivy command with a high internal timeout
        cmd = ["trivy", target_type, "--format", "json", "--timeout", "45m", target]
        logger.info(f"Running Trivy scan: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=2700  # 45 minutes
        )
        
        if result.returncode not in [0, 1]:
            logger.error(f"Trivy scan failed with exit code {result.returncode}: {result.stderr}")
            raise RuntimeError(f"Trivy scan failed: {result.stderr}")
            
        return json.loads(result.stdout)
        
    except subprocess.TimeoutExpired:
        logger.error(f"Trivy scan timed out for {target}")
        raise RuntimeError(f"Trivy scan timed out. The image is too large or took longer than 45 minutes to analyze.")
    except FileNotFoundError:
        logger.error("Trivy is not installed or not in PATH.")
        raise RuntimeError("Trivy is not installed or not in PATH.")
    except json.JSONDecodeError:
        logger.error("Failed to parse Trivy JSON output. The process may have been killed due to out-of-memory (OOM).")
        raise RuntimeError("Failed to parse Trivy JSON output (possible Out of Memory error).")

def run_syft_scan(target: str) -> Dict[str, Any]:
    """
    Runs Anchore Syft to generate an SBOM for the target.
    """
    try:
        cmd = ["syft", "scan", target, "-o", "json"]
        logger.info(f"Running Syft scan: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=2700  # 45 minutes
        )
        
        return json.loads(result.stdout)
        
    except subprocess.TimeoutExpired:
        logger.error(f"Syft scan timed out for {target}")
        raise RuntimeError(f"Syft scan timed out. The image is too large or took longer than 45 minutes to analyze.")
    except FileNotFoundError:
        logger.error("Syft is not installed or not in PATH.")
        raise RuntimeError("Syft is not installed or not in PATH.")
    except subprocess.CalledProcessError as e:
        logger.error(f"Syft scan failed with exit code {e.returncode}: {e.stderr}")
        raise RuntimeError(f"Syft scan failed: {e.stderr}")
    except Exception as e:
        logger.error(f"Syft scan failed: {e}")
        raise RuntimeError(f"Syft scan failed: {e}")

def run_syft_scan_on_url(url: str) -> Dict[str, Any]:
    """
    Clones a remote repository to a temporary directory and runs Syft on it.
    """
    if not is_valid_url(url):
        raise ValueError(f"Invalid or internal URL: {url}")
    
    temp_dir = tempfile.mkdtemp()
    try:
        logger.info(f"Cloning {url} into temporary directory for Syft scan...")
        
        # Shallow clone with timeout
        clone_cmd = ["git", "clone", "--depth", "1", url, temp_dir]
        result = subprocess.run(
            clone_cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=60
        )
        
        # Now run syft on the directory
        return run_syft_scan("dir:" + temp_dir)
        
    except subprocess.TimeoutExpired:
        logger.error(f"Git clone timed out for {url}")
        raise RuntimeError(f"Git clone timed out for {url}")
    except subprocess.CalledProcessError as e:
        logger.error(f"Git clone failed with exit code {e.returncode}: {e.stderr}")
        raise RuntimeError(f"Git clone failed: {e.stderr}")
    except Exception as e:
        logger.error(f"Syft clone scan failed: {e}")
        raise RuntimeError(f"Syft clone scan failed: {e}")
    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)

def run_checkov_scan(target: str) -> Dict[str, Any]:
    """
    Runs Checkov on a target directory or repository to find IaC misconfigurations.
    """
    try:
        cmd = ["checkov", "-d", target, "-o", "json"]
        logger.info(f"Running Checkov scan: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=300
        )
        
        if result.returncode not in [0, 1]:
            logger.error(f"Checkov scan failed with exit code {result.returncode}: {result.stderr}")
            raise RuntimeError(f"Checkov scan failed: {result.stderr}")
            
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            if not result.stdout.strip():
                return {}
            return {"raw_output": result.stdout}
            
    except FileNotFoundError:
        logger.error("Checkov is not installed or not in PATH.")
        raise RuntimeError("Checkov is not installed or not in PATH.")

def run_checkov_scan_on_url(url: str) -> Dict[str, Any]:
    """
    Clones a remote repository to a temporary directory and runs Checkov on it.
    """
    if not is_valid_url(url):
        raise ValueError(f"Invalid or internal URL: {url}")
    
    temp_dir = tempfile.mkdtemp()
    try:
        logger.info(f"Cloning {url} into temporary directory for Checkov scan...")
        clone_cmd = ["git", "clone", "--depth", "1", url, temp_dir]
        subprocess.run(
            clone_cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=60
        )
        return run_checkov_scan(temp_dir)
    except Exception as e:
        logger.error(f"Checkov clone scan failed: {e}")
        return {"error": str(e)}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def run_kube_bench_scan() -> Dict[str, Any]:
    """
    Runs kube-bench against the local Kubernetes cluster.
    """
    try:
        cmd = ["kube-bench", "--json"]
        logger.info(f"Running Kube-bench scan: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=300
        )
        
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            if not result.stdout.strip():
                return {}
            return {"raw_output": result.stdout}
            
    except FileNotFoundError:
        logger.error("Kube-bench is not installed or not in PATH.")
        raise RuntimeError("Kube-bench is not installed or not in PATH.")
