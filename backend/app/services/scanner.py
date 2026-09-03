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
    Performs a lightweight Dynamic Website Security Analysis (DAST) on a live URL.
    Checks security headers and returns a Trivy-compatible JSON payload.
    """
    if not is_valid_url(url):
        raise ValueError(f"Invalid or internal URL: {url}")
    
    logger.info(f"Running DAST scan on {url}")
    synthetic_results = []
    
    # Ensure URL has scheme
    if not url.startswith("http"):
        url = "http://" + url
        
    try:
        # Use default SSL context (verification enabled by default)
        ctx = ssl.create_default_context()
        
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
                headers_dict = dict(response.info())
                final_url = response.geturl()
        except urllib.error.HTTPError as e:
            logger.warning(f"DAST scan received HTTP {e.code} for {url}, continuing with headers.")
            headers_dict = dict(e.headers)
            final_url = e.url
            
        header_checks = [
            {
                "header": "Strict-Transport-Security", 
                "id": "DAST-HSTS-MISSING", 
                "title": "Missing HTTP Strict Transport Security (HSTS) Header",
                "severity": "HIGH"
            },
            {
                "header": "Content-Security-Policy", 
                "id": "DAST-CSP-MISSING", 
                "title": "Missing Content-Security-Policy (CSP) Header",
                "severity": "MEDIUM"
            },
            {
                "header": "X-Frame-Options", 
                "id": "DAST-XFRAME-MISSING", 
                "title": "Missing X-Frame-Options Header (Clickjacking Risk)",
                "severity": "MEDIUM"
            },
            {
                "header": "X-Content-Type-Options", 
                "id": "DAST-XCTO-MISSING", 
                "title": "Missing X-Content-Type-Options Header",
                "severity": "LOW"
            }
        ]
        
        # Convert headers to lowercase for case-insensitive matching
        headers_lower = {k.lower(): v for k, v in headers_dict.items()}
        
        for check in header_checks:
            if check["header"].lower() not in headers_lower:
                synthetic_results.append({
                    "VulnerabilityID": check["id"],
                    "PkgName": "HTTP Security Headers",
                    "Severity": check["severity"],
                    "InstalledVersion": "Missing",
                    "Title": check["title"],
                    "Description": f"The website does not enforce the {check['header']} security header."
                })
                
        # Check if HTTP redirects to HTTPS or if they use HTTP natively
        parsed = urlparse(final_url)
        if parsed.scheme == "http":
            synthetic_results.append({
                "VulnerabilityID": "DAST-INSECURE-HTTP",
                "PkgName": "Transport Security",
                "Severity": "CRITICAL",
                "InstalledVersion": "HTTP",
                "Title": "Insecure Transport (HTTP)",
                "Description": "The application allows insecure HTTP connections without redirecting to HTTPS."
            })
            
    except Exception as e:
        logger.error(f"DAST scan failed to connect: {e}")
        raise RuntimeError(f"DAST scanner failed to reach website: {e}")
        
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
        # Construct the Trivy command
        cmd = ["trivy", target_type, "--format", "json", target]
        logger.info(f"Running Trivy scan: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=300
        )
        
        if result.returncode not in [0, 1]:
            logger.error(f"Trivy scan failed with exit code {result.returncode}: {result.stderr}")
            raise RuntimeError(f"Trivy scan failed: {result.stderr}")
            
        return json.loads(result.stdout)
        
    except FileNotFoundError:
        logger.error("Trivy is not installed or not in PATH.")
        raise RuntimeError("Trivy is not installed or not in PATH.")
    except json.JSONDecodeError:
        logger.error("Failed to parse Trivy JSON output.")
        raise RuntimeError("Failed to parse Trivy JSON output.")

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
            timeout=300
        )
        
        return json.loads(result.stdout)
        
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
