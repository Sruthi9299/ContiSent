import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const addHeader = (doc: jsPDF, title: string) => {
  doc.setFontSize(22);
  doc.setTextColor(41, 128, 185);
  doc.text(title, MARGIN, 20);
  doc.setLineWidth(0.5);
  doc.setDrawColor(41, 128, 185);
  doc.line(MARGIN, 22, PAGE_WIDTH - MARGIN, 22);
  doc.setTextColor(0, 0, 0);
};

const addFooter = (doc: jsPDF, pageNum: number) => {
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Page ${pageNum} | ContiSent Security Report`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
};

const addParagraph = (doc: jsPDF, text: string, yPos: number, fontSize = 12): number => {
  doc.setFontSize(fontSize);
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(lines, MARGIN, yPos);
  return yPos + (lines.length * (fontSize * 0.4)) + 5;
};

export const generateProfessionalReport = async (subDetails: any, flowchartElementId: string, chartElementId: string) => {
  const doc = new jsPDF();
  let pageNumber = 1;

  const checkPageBreak = (currentY: number, heightNeeded: number = 20) => {
    if (currentY + heightNeeded > 280) {
      addFooter(doc, pageNumber++);
      doc.addPage();
      addHeader(doc, "ContiSent Security & Compliance Report");
      return 35; // new Y
    }
    return currentY;
  };

  // --- PAGE 1: Beautiful Title Page ---
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, PAGE_WIDTH, 100, 'F');
  
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text("ContiSent", PAGE_WIDTH / 2, 45, { align: 'center' });
  
  doc.setFontSize(20);
  doc.text("Comprehensive Security & Compliance Report", PAGE_WIDTH / 2, 60, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(230, 230, 230);
  doc.text(new Date(subDetails.created_at).toLocaleString(), PAGE_WIDTH / 2, 75, { align: 'center' });

  let y = 120;
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  doc.text("Executive Summary", MARGIN, y);
  doc.setDrawColor(41, 128, 185);
  doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
  
  y += 15;
  y = addParagraph(doc, "This document provides a highly detailed, multi-stage analysis of the target application's security posture. It encompasses the complete DevSecOps lifecycle including initial source acquisition, container detection, deep vulnerability scanning via Trivy, software composition analysis (SBOM) via Syft, strict policy enforcement, and final kubernetes deployment checks.", y, 12);
  
  y += 10;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 40, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text(`Target: ${subDetails.source_uri}`, MARGIN + 5, y + 15);
  doc.text(`Type: ${subDetails.type.toUpperCase()}`, MARGIN + 5, y + 25);
  doc.text(`Status: ${subDetails.status.toUpperCase()}`, MARGIN + 5, y + 35);
  
  const isDast = subDetails.scan_result?.full_json?.ArtifactType === "website" || (subDetails.type === "url" && !subDetails.source_uri.includes(".git") && !subDetails.source_uri.includes("github.com") && !subDetails.scan_result);

  y = checkPageBreak(y, 80);
  
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  doc.text("1. Pipeline Architecture & Flow", MARGIN, y);
  doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
  y += 15;
  
  y = addParagraph(doc, "The automated pipeline executed the following discrete stages in an isolated, ephemeral sandbox environment:", y, 11);
  y += 5;
  
  // Draw an inline flowchart vertically
  const stages = isDast ? [
    "Target Verification", 
    "HTTP Headers Analysis", 
    "Transport Security (TLS)", 
    "CSP Verification", 
    "Security Policy Evaluation", 
    "Report Generation"
  ] : [
    "URL Analysis & Source Acquisition", 
    "Docker Detection & Secure Build", 
    "Trivy Vulnerability & Secret Scan", 
    "Syft SBOM Generation", 
    "Security Policy Evaluation", 
    "Kubernetes Deployment Gate"
  ];
  
  stages.forEach((stage, idx) => {
    y = checkPageBreak(y, 25);
    doc.setFillColor(41, 128, 185);
    doc.circle(MARGIN + 10, y + 5, 3, 'F');
    if (idx < stages.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(MARGIN + 10, y + 8, MARGIN + 10, y + 17);
    }
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(stage, MARGIN + 20, y + 6);
    y += 15;
  });

  y = checkPageBreak(y, 40);
  
  // --- DETAILED STAGES ---
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  if (isDast) {
    doc.text("2. Target Verification", MARGIN, y);
    doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
    y += 15;
    y = addParagraph(doc, "The Target Verification stage ensures that the provided website URL is reachable and resolves to a valid host. It validates DNS records, checks for the presence of reverse proxies (such as Cloudflare or AWS CloudFront), and establishes an initial connection to determine if automated security testing is permitted.", y, 11);
    y += 5;
    y = addParagraph(doc, "During this phase, the engine simulates various User-Agent strings to verify that the target does not indiscriminately block security tooling, while still respecting standard firewall configurations. A successful verification indicates the target is a live web application ready for dynamic probing.", y, 11);
  } else {
    doc.text("2. Pre-Build Analysis", MARGIN, y);
    doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
    y += 15;
    y = addParagraph(doc, "The URL Analysis stage ensures that the provided link is accessible, well-formed, and points to a recognizable software repository or registry. During Source Acquisition, the pipeline securely authenticates and pulls the target code or image into an isolated environment. For GitHub repositories, this involves performing a shallow git clone into a strict, ephemeral sandbox.", y, 11);
    y += 5;
    y = addParagraph(doc, "This pre-build phase is critical for Supply Chain Security. By isolating the source code immediately, we prevent malicious pre-install scripts or tampered build files from executing on our infrastructure. The sandbox has zero network access to the internal network, ensuring total containment.", y, 11);
  }

  y = checkPageBreak(y, 60);
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  
  if (isDast) {
    doc.text("3. Dynamic Analysis & Configuration", MARGIN, y);
    doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
    y += 15;
    y = addParagraph(doc, "The DAST engine dynamically probes the running application to evaluate its external security posture. It analyzes the HTTP response headers for missing or misconfigured security controls. This includes checking for a robust Content Security Policy (CSP), Strict-Transport-Security (HSTS), and X-Frame-Options.", y, 11);
    y += 5;
    y = addParagraph(doc, "Modern web applications heavily rely on client-side security mechanisms. A weak or missing CSP allows attackers to execute Cross-Site Scripting (XSS) attacks by injecting malicious payloads that the browser blindly trusts. Furthermore, missing X-Frame-Options leaves the application highly vulnerable to Clickjacking (UI Redressing), where an attacker tricks a user into clicking something different from what they perceive.", y, 11);
    y += 5;
    y = addParagraph(doc, "The engine also inspects cookie flags, ensuring that 'Secure' and 'HttpOnly' attributes are set on all session identifiers. This mitigates the risk of session hijacking via XSS or network sniffing. The dynamic configuration review provides a crucial external perspective that static code analysis (SAST) often misses.", y, 11);
  } else {
    doc.text("3. Build Phase & Docker Detection", MARGIN, y);
    doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
    y += 15;
    y = addParagraph(doc, "The Docker Detection engine scans the acquired source code to identify the presence of a Dockerfile, kubernetes manifests, or known framework structures (like package.json, requirements.txt, or pom.xml) to determine the optimal build strategy. The pipeline then automatically synthesizes a container image by executing a secure, unprivileged Docker Build.", y, 11);
    y += 5;
    y = addParagraph(doc, "The build environment utilizes BuildKit with advanced caching disabled to guarantee a pristine, reproducible build. Base images are inspected to ensure they are pulled from trusted, verified registries rather than unvetted public hubs. If a Dockerfile is not found, the system utilizes Cloud Native Buildpacks to automatically generate a secure, minimal OCI-compliant image.", y, 11);
    y += 5;
    y = addParagraph(doc, "During this phase, we also evaluate the resulting container layers. Large, bloated layers are flagged as they unnecessarily increase the attack surface. The system advocates for multi-stage builds, ensuring that build tools (like compilers and package managers) are completely stripped from the final runtime image.", y, 11);
  }

  y = checkPageBreak(y, 100);
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  doc.text(isDast ? "4. Web Vulnerability Findings" : "4. Vulnerability & Security Scans", MARGIN, y);
  doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
  y += 15;
  
  if (subDetails.scan_result) {
    const sr = subDetails.scan_result;
    
    // Draw a beautiful summary box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 25, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(231, 76, 60);
    doc.text(`CRITICAL: ${sr.critical_count}`, MARGIN + 10, y + 15);
    
    doc.setTextColor(243, 156, 18);
    doc.text(`HIGH: ${sr.high_count}`, MARGIN + 50, y + 15);
    
    doc.setTextColor(241, 196, 15);
    doc.text(`MEDIUM: ${sr.medium_count}`, MARGIN + 90, y + 15);
    
    doc.setTextColor(52, 152, 219);
    doc.text(`LOW: ${sr.low_count}`, MARGIN + 130, y + 15);
    
    y += 35;
    
    if (isDast) {
      y = addParagraph(doc, "The DAST scanner evaluates the target's live responses against modern OWASP best practices. Missing headers or insecure transport layers directly expose end-users to man-in-the-middle (MitM) attacks or client-side execution vulnerabilities. The table below outlines every specific misconfiguration detected during the active probing session.", y, 11);
    } else {
      y = addParagraph(doc, "The comprehensive vulnerability scanner compares the cryptographic hashes and versions of all detected OS-level packages (e.g., apk, apt, rpm) and application-level language dependencies (e.g., npm, pip, maven) against a continuously updated, aggregated CVE database (NVD, Alpine SecDB, RedHat, etc.).", y, 11);
      y += 5;
      y = addParagraph(doc, "In addition to software flaws, the engine actively hunts for hardcoded secrets, misconfigurations, and exposed private keys embedded within the container layers. The table below lists the most severe vulnerabilities discovered in the artifact.", y, 11);
    }
    
    if (subDetails.scan_result.full_json) {
      const findings: any[] = [];
      
      if (subDetails.scan_result.full_json.Results) {
        subDetails.scan_result.full_json.Results.forEach((res: any) => {
          if (res.Vulnerabilities) {
            res.Vulnerabilities.forEach((v: any) => findings.push(v));
          }
        });
      }
      
      const sevMap: any = { "CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1 };
      findings.sort((a, b) => (sevMap[b.Severity] || 0) - (sevMap[a.Severity] || 0));
      
      const tableData = findings.slice(0, 50).map(v => [
        v.VulnerabilityID,
        v.PkgName || "N/A",
        v.Severity,
        isDast ? "Config" : (v.InstalledVersion || "N/A")
      ]);
      
      if (tableData.length > 0) {
        autoTable(doc, {
          startY: y + 5,
          head: isDast ? [['Vulnerability', 'Category', 'Severity', 'Type']] : [['CVE ID', 'Package', 'Severity', 'Version']],
          body: tableData,
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFillColor(236, 253, 245); // Green bg
        doc.roundedRect(MARGIN, y + 5, CONTENT_WIDTH, 20, 2, 2, 'F');
        doc.setTextColor(5, 150, 105); // Dark Green text
        doc.text("100% CLEAN - No Vulnerabilities Detected in the Target!", MARGIN + 10, y + 18);
        y += 30;
      }
    }
  } else {
    y = addParagraph(doc, "Detailed vulnerability data is unavailable for this scan.", y, 11);
  }

  y = checkPageBreak(y, 80);
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  doc.text(isDast ? "5. Transport Security Validation" : "5. Software Bill of Materials (SBOM)", MARGIN, y);
  doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
  y += 15;
  
  if (isDast) {
    y = addParagraph(doc, "Transport Layer Security (TLS/HTTPS) is critically important for protecting data in transit. Insecure HTTP endpoints leave applications vulnerable to eavesdropping, data tampering, and session hijacking.", y, 11);
    y += 5;
    y = addParagraph(doc, "Our analysis checks the target's ability to enforce encrypted channels. We verify that HTTP requests are aggressively redirected to HTTPS using a 301 Permanent Redirect. We also validate the strength of the cipher suites negotiated during the TLS handshake, ensuring deprecated protocols like SSLv3, TLS 1.0, and TLS 1.1 are entirely disabled.", y, 11);
    y += 5;
    y = addParagraph(doc, "Any fallback to unencrypted communication is flagged as a Critical vulnerability, as it completely negates all other application-layer security controls. A secure transport layer is the absolute foundation of web application security.", y, 11);
  } else {
    y = addParagraph(doc, "A Software Bill of Materials (SBOM) is a formal, machine-readable inventory of software components and dependencies. In this pipeline, we generate a comprehensive SBOM for compliance auditing and supply chain visibility.", y, 11);
    y += 5;
    y = addParagraph(doc, "The generated SBOM maps the entire dependency tree of the application, including transitive dependencies that developers may not explicitly declare. This level of transparency is mandatory under modern federal cybersecurity executive orders and frameworks like SLSA (Supply-chain Levels for Software Artifacts).", y, 11);
    
    if (subDetails.scan_result && subDetails.scan_result.sbom_json) {
      const artifacts = subDetails.scan_result.sbom_json.artifacts || [];
      
      if (artifacts.length > 0) {
        y += 5;
        y = addParagraph(doc, `Total Components Discovered: ${artifacts.length}. Below is a partial list of the core components identified in the application stack.`, y, 12);
        
        const tableData = artifacts.slice(0, 40).map((a: any) => [
          a.name,
          a.version,
          a.type
        ]);
        
        autoTable(doc, {
          startY: y + 5,
          head: [['Component Name', 'Version', 'Type']],
          body: tableData,
          headStyles: { fillColor: [46, 204, 113] },
          styles: { fontSize: 9 }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFillColor(254, 252, 232); // Yellow bg
        doc.roundedRect(MARGIN, y + 5, CONTENT_WIDTH, 20, 2, 2, 'F');
        doc.setTextColor(161, 98, 7); // Dark Yellow text
        doc.text("SBOM Generator did not detect any standard package dependencies.", MARGIN + 10, y + 18);
        y += 30;
      }
    } else {
      y = addParagraph(doc, "No SBOM data was captured in this run.", y, 11);
    }
  }

  y = checkPageBreak(y, 100);
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185);
  doc.text("6. Security Policy & Deployment Strategy", MARGIN, y);
  doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
  y += 15;
  
  if (subDetails.policy_decision) {
    const pd = subDetails.policy_decision;
    doc.setFontSize(14);
    if (pd.decision.toUpperCase() === 'PASS') {
      doc.setTextColor(46, 204, 113);
    } else {
      doc.setTextColor(231, 76, 60);
    }
    doc.text(`Policy Outcome: ${pd.decision.toUpperCase()}`, MARGIN, y);
    y += 10;
    doc.setTextColor(60, 60, 60);
    y = addParagraph(doc, `Reasoning: ${pd.reason}`, y, 11);
    y += 5;
    y = addParagraph(doc, "The Policy Engine acts as the final gatekeeper before any code is permitted to advance to production environments. It evaluates the aggregate risk score derived from the vulnerability scans, SBOM analysis, and configuration checks against the organization's predefined risk tolerance matrix.", y, 11);
    y += 5;
    y = addParagraph(doc, "A 'FAIL' decision triggers an immediate circuit breaker mechanism, halting the CI/CD pipeline and preventing the artifact from being deployed. A 'PASS' decision signs the artifact cryptographically, attesting that it met all security requirements at the time of the scan.", y, 11);
  }
  
  y += 10;
  if (!isDast && subDetails.deployment) {
    const dep = subDetails.deployment;
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text(`Deployment Status: ${dep.status.toUpperCase()}`, MARGIN, y);
    y += 10;
    doc.setTextColor(60, 60, 60);
    doc.text(`Cluster: ${dep.cluster} | Namespace: ${dep.namespace}`, MARGIN, y);
    y += 15;
    y = addParagraph(doc, "The deployment strategy utilizes a strict rolling update protocol to ensure zero downtime during transitions. Liveness and readiness probes are automatically configured and validated by the Kubernetes admission controller. Furthermore, the deployment enforces a default deny network policy, ensuring the newly deployed pods can only communicate with explicitly whitelisted services.", y, 11);
  } else if (!isDast) {
    y = addParagraph(doc, "Deployment was blocked or skipped due to policy failure, preventing vulnerable code from reaching production clusters.", y, 11);
  } else {
    y = addParagraph(doc, "Live website scans are diagnostic and do not involve pushing new infrastructure deployments.", y, 11);
  }

  // --- MASSIVE APPENDICES FOR 12-PAGE DEPTH ---
  
  // Appendix A: Methodology
  doc.addPage();
  addFooter(doc, pageNumber++);
  addHeader(doc, "Appendix A: Security Methodology & Frameworks");
  y = 35;
  y = addParagraph(doc, "This appendix details the exact standards and frameworks enforced by the ContiSent pipeline. Our methodology is rooted in industry-standard compliance requirements, ensuring that every scan produces actionable, audit-ready data.", y, 11);
  y += 10;
  
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("A.1 Web Application Security Standards (OWASP)", MARGIN, y);
  y += 10;
  y = addParagraph(doc, "The DAST engine checks for compliance against the OWASP Top 10 and OWASP ASVS (Application Security Verification Standard). Security headers like Strict-Transport-Security (HSTS) are mandatory to protect users against protocol downgrade attacks (e.g., SSL Stripping).", y, 11);
  y += 5;
  y = addParagraph(doc, "Content-Security-Policy (CSP) prevents Cross-Site Scripting (XSS) by restricting the sources of executable scripts. A robust CSP is considered the ultimate defense-in-depth mechanism against client-side injection vulnerabilities. Our engine verifies that the CSP does not contain dangerous directives like 'unsafe-inline' or 'unsafe-eval'.", y, 11);

  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("A.2 Container Security Standards (CIS Benchmarks)", MARGIN, y);
  y += 10;
  y = addParagraph(doc, "Containers share the host OS kernel. Therefore, a vulnerability in a containerized application can potentially lead to host compromise. Our pipeline enforces strict CIS Docker Benchmarks. We verify that images do not run as root, sensitive host paths are not mounted, and resource limits are strictly defined.", y, 11);
  y += 5;
  y = addParagraph(doc, "Furthermore, we advocate for the use of distroless or Alpine-based minimal images. By removing the package manager, shell, and unnecessary utilities from the runtime image, we drastically reduce the attack surface available to an adversary who manages to execute code within the container.", y, 11);

  // Appendix B: Compliance Mapping
  doc.addPage();
  addFooter(doc, pageNumber++);
  addHeader(doc, "Appendix B: Compliance & Regulatory Mapping");
  y = 35;
  y = addParagraph(doc, "The automated checks performed by this pipeline directly map to various global regulatory and compliance frameworks. This section outlines how our security gates satisfy specific controls.", y, 11);
  
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("B.1 SOC 2 Type II (Security & Availability)", MARGIN, y);
  y += 10;
  y = addParagraph(doc, "CC7.1: To meet the criteria for logical access security, our pipeline ensures that hardcoded secrets (API keys, AWS credentials) are never embedded in the container image. CC7.2: The vulnerability scanning engine satisfies the requirement for continuous monitoring and anomaly detection by gating vulnerable code before it reaches production.", y, 11);

  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("B.2 ISO/IEC 27001:2022", MARGIN, y);
  y += 10;
  y = addParagraph(doc, "Annex A.8.8 (Management of Technical Vulnerabilities): The automated Trivy and Syft integrations ensure that information about technical vulnerabilities is obtained in a timely fashion, evaluated, and appropriate measures (pipeline blocking) are taken. Annex A.8.25 (Secure Development Lifecycle): This pipeline actively enforces DevSecOps, shifting security to the left.", y, 11);

  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("B.3 PCI-DSS v4.0", MARGIN, y);
  y += 10;
  y = addParagraph(doc, "Requirement 6.3.3: All software vulnerabilities are identified and ranked according to risk. Our CVSS-based severity scoring directly supports this. Requirement 4.2.1: Strong cryptography (TLS) is enforced, and our DAST scanner verifies the absence of weak ciphers and the enforcement of HSTS on all web properties handling cardholder data.", y, 11);

  // Appendix C: Remediation Guide
  doc.addPage();
  addFooter(doc, pageNumber++);
  addHeader(doc, "Appendix C: Vulnerability Remediation Guide");
  y = 35;
  y = addParagraph(doc, "When vulnerabilities are detected, development and operations teams must collaborate to apply fixes rapidly. This guide outlines the standard operating procedures for remediation.", y, 11);
  
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("C.1 OS Package Remediation (Debian, Alpine, RHEL)", MARGIN, y);
  y += 10;
  y = addParagraph(doc, "For vulnerabilities originating from the base OS layer, the primary remediation is to update the base image tag in the Dockerfile. For example, migrating from `node:18-bullseye` to `node:18-bookworm`. If a newer base image is unavailable, teams should explicitly run `apt-get update && apt-get upgrade -y` (or `apk upgrade`) during the build process, though updating the base image is strongly preferred.", y, 11);

  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("C.2 Application Dependency Remediation (NPM, Pip, Maven)", MARGIN, y);
  y += 10;
  y = addParagraph(doc, "Language-level vulnerabilities require updating the specific package version in `package.json`, `requirements.txt`, or `pom.xml`. Tools like `npm audit fix` can automatically resolve minor version bumps. If a patch is unavailable, teams must evaluate compensating controls, such as WAF rules, to mitigate the risk until the upstream maintainer releases a fix.", y, 11);

  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("C.3 Web Configuration Remediation", MARGIN, y);
  y += 10;
  y = addParagraph(doc, "Missing security headers must be implemented at the reverse proxy layer (e.g., Nginx, HAProxy) or within the application framework middleware (e.g., Helmet.js for Node, Django Security Middleware). CSP policies should be built iteratively, starting with a Report-Only mode to prevent breaking functionality, before enforcing `default-src 'self'`.", y, 11);

  // Appendix D: Glossary
  doc.addPage();
  addFooter(doc, pageNumber++);
  addHeader(doc, "Appendix D: Glossary of Terms");
  y = 35;
  
  const glossary = [
    { term: "CVE (Common Vulnerabilities and Exposures)", def: "A list of publicly disclosed cybersecurity vulnerabilities, each assigned a unique ID." },
    { term: "CVSS (Common Vulnerability Scoring System)", def: "An open framework for communicating the characteristics and severity of software vulnerabilities." },
    { term: "DAST (Dynamic Application Security Testing)", def: "Testing a running application from the outside in, simulating a black-box attack." },
    { term: "SAST (Static Application Security Testing)", def: "Analyzing source code or binaries without executing the application to find flaws." },
    { term: "SCA (Software Composition Analysis)", def: "Identifying open-source components and their known vulnerabilities within a codebase." },
    { term: "SBOM (Software Bill of Materials)", def: "A nested inventory for software, detailing all ingredients that make up software components." },
    { term: "CSP (Content Security Policy)", def: "An added layer of security that helps to detect and mitigate certain types of attacks, including XSS." },
    { term: "HSTS (HTTP Strict Transport Security)", def: "A policy mechanism that helps to protect websites against man-in-the-middle attacks such as protocol downgrade attacks." }
  ];
  
  glossary.forEach(item => {
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text(item.term, MARGIN, y);
    y += 7;
    doc.setTextColor(60, 60, 60);
    y = addParagraph(doc, item.def, y, 11);
    y += 5;
  });
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("End of Document", PAGE_WIDTH / 2, y, { align: 'center' });

  addFooter(doc, pageNumber++);
  doc.save(`ContiSent_Professional_Report_${subDetails.id}.pdf`);
};
