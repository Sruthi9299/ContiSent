FROM python:3.11-slim-bookworm

WORKDIR /app

# Install dependencies for Trivy, Syft, Kube-bench, Nmap and Nikto
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wget curl git docker.io nmap && \
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin && \
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin && \
    ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        curl -L https://github.com/aquasecurity/kube-bench/releases/download/v0.8.0/kube-bench_0.8.0_linux_amd64.tar.gz -o kube-bench.tar.gz; \
    elif [ "$ARCH" = "arm64" ]; then \
        curl -L https://github.com/aquasecurity/kube-bench/releases/download/v0.8.0/kube-bench_0.8.0_linux_arm64.tar.gz -o kube-bench.tar.gz; \
    else \
        echo "Unsupported architecture"; exit 1; \
    fi && \
    tar -xvf kube-bench.tar.gz && \
    mv kube-bench /usr/local/bin/ && \
    rm -f kube-bench.tar.gz && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
