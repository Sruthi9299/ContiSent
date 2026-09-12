# ContiSent (Container Security Automation Platform)

## Project Overview
ContiSent is a centralized Container Security Automation platform designed to validate and secure containerized applications before deployment. It orchestrates automated Docker image builds, deep vulnerability scanning using Trivy, and Kubernetes deployment testing, allowing developers to monitor container security postures through a clean web dashboard.

## Architecture
- **Frontend**: Next.js (React 19), Tailwind CSS v4, TypeScript, shadcn/ui, Recharts, Three.js
- **Backend**: FastAPI, SQLAlchemy, Alembic, Pydantic, PostgreSQL
- **Asynchronous Task Processing**: Celery, Redis (Message Broker)
- **Container Security & Orchestration**: Docker SDK, Trivy (Container Scanning), Kubernetes SDK

## Security Pipeline
1. User submits a Dockerfile or container image registry link via the Next.js frontend dashboard.
2. The FastAPI backend receives the request, stores metadata in PostgreSQL, and queues a background task in Redis.
3. The Celery worker picks up the task and uses the Docker SDK to pull or build the container image.
4. The worker triggers **Trivy** to perform deep container scanning (identifying OS packages, language-specific dependencies, and known CVEs).
5. A Security Gate is evaluated based on the severity of the Trivy findings.
6. If the container passes the security gate, the Kubernetes SDK provisions a test namespace and deploys the container to validate its runtime configuration.
7. Scan results, CVE details, and Kubernetes deployment statuses are saved back to the database.
8. The frontend fetches and visualizes the container health, vulnerabilities, and deployment success metrics.

## Quick Start: Deploy Now via GitHub Codespaces

Because this project is fully containerized, you can instantly spin it up in GitHub Codespaces without installing anything locally.

1. **Launch a Codespace**: Go to this repository on GitHub, click the green **Code** button, and select **Create codespace**.
2. **Start the Application**: In the Codespaces terminal, simply run:
   ```bash
   docker-compose up --build -d
   ```
3. **Access the App**: Codespaces will automatically forward the ports. Click on the **Ports** tab in your terminal:
   - Click the link for Port `3000` to view the **Frontend Web UI**.
   - Click the link for Port `8000` (and add `/docs` to the URL) to view the **Backend API**.

## Running Tests

**Backend (FastAPI)**:
Ensure you have a virtual environment set up and dependencies installed.
```bash
cd backend
pip install -r requirements.txt
pytest
```

**Frontend (Next.js)**:
Ensure Node modules are installed.
```bash
cd frontend
npm install
npm run lint
```

## Local Kubernetes Deployment Guide (Using Kind)

You can run and test the Kubernetes aspects of ContiSent locally or inside your Codespace using `kind` (Kubernetes in Docker).

1. **Install Kind**:
   ```bash
   curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
   chmod +x ./kind
   sudo mv ./kind /usr/local/bin/kind
   ```
2. **Create a Cluster**:
   ```bash
   kind create cluster --name contisent-cluster
   ```
3. **Deploy the Manifests**:
   ```bash
   cd k8s
   kubectl apply -f backend-deployment.yaml
   kubectl apply -f frontend-deployment.yaml
   ```
4. **Port Forward the Services**:
   - Frontend: `kubectl port-forward svc/frontend-service 3000:3000`
   - Backend: `kubectl port-forward svc/backend-service 8000:8000`

## Security Hardening Features
- **Rate Limiting**: Implementation via `slowapi` to protect API endpoints against brute force and DDoS attacks (`Too many requests`).
- **CORS Management**: Tightly restricted using FastAPI's `CORSMiddleware` and `ALLOWED_ORIGINS` settings.
- **Authentication & Hashing**: JWT-based session tokens with `python-jose`, accompanied by secure password hashing using `passlib` and `bcrypt`.
