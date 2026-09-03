# Oracle Cloud Always Free + Kubernetes Setup Guide

This guide will walk you through setting up a permanently free Kubernetes cluster on Oracle Cloud and deploying your ContiSent backend to it.

## 1. Create the Free Oracle Cloud Server
1. Sign up for an **Oracle Cloud** account.
2. Go to **Compute -> Instances** and click **Create Instance**.
3. Name it `contisent-server`.
4. In **Image and Shape**, click Edit:
   - **Image:** Ubuntu 22.04
   - **Shape:** Select **Ampere** (ARM) -> `VM.Standard.A1.Flex`. 
   - *Ensure it says "Always Free Eligible". Set OCPUs to 4 and Memory to 24GB (the max free limit).*
5. In **Networking**, select "Create new virtual cloud network".
6. In **Add SSH Keys**, click "Save private key" (keep this file safe on your computer, you need it to log in).
7. Click **Create**.

## 2. Open Firewall Ports (Crucial!)
Oracle blocks almost all traffic by default. You need to open port `8000` (for the backend API).
1. Click on your newly created instance.
2. Click on the attached **Subnet**.
3. Click on the **Security List** (usually named `Default Security List...`).
4. Click **Add Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **Destination Port Range:** `30080` (This is the Kubernetes NodePort we configured).
   - Click **Add Ingress Rules**.
*(Note: You must also open the firewall inside the Ubuntu VM itself, we will do this in step 3).*

## 3. Install Kubernetes (k3s) on the Server
1. Open Git Bash (or Terminal) on your computer and SSH into your server using the private key you downloaded:
   ```bash
   # Replace the IP with your Oracle Server's Public IP
   ssh -i /path/to/your/private-key.key ubuntu@YOUR_SERVER_PUBLIC_IP
   ```
2. Once logged in, open the Ubuntu firewall for our port:
   ```bash
   sudo iptables -I INPUT -p tcp --dport 30080 -j ACCEPT
   sudo netfilter-persistent save
   ```
3. Install **k3s** (a super lightweight, production-ready Kubernetes):
   ```bash
   curl -sfL https://get.k3s.io | sh -
   ```
   *(Wait a minute for it to finish installing and starting up).*

## 4. Deploy Your Application
1. Before deploying, ensure you have pushed all your code to GitHub. GitHub Actions will automatically build your Docker image and store it in your GitHub Packages (ghcr.io).
2. On your Oracle server, you need to create the files I generated for you (`backend-deployment.yaml`).
3. Back on your local computer, copy the contents of `k8s/backend-deployment.yaml`. 
4. **IMPORTANT**: In the YAML file, find the line `image: ghcr.io/YOUR_GITHUB_USERNAME/contisent-backend:latest` and replace `YOUR_GITHUB_USERNAME` with your actual GitHub username!
5. On the Oracle server, paste it into a file:
   ```bash
   nano backend-deployment.yaml
   # (Paste the code, then press Ctrl+X, Y, Enter to save)
   ```
6. Apply the deployment to Kubernetes:
   ```bash
   sudo k3s kubectl apply -f backend-deployment.yaml
   ```
7. Check if it's running:
   ```bash
   sudo k3s kubectl get pods
   ```

## 5. Connect Vercel to your new Backend
1. Go to Vercel where your frontend is deployed.
2. Go to **Settings -> Environment Variables**.
3. Add `NEXT_PUBLIC_API_URL`.
4. Set the value to `http://YOUR_SERVER_PUBLIC_IP:30080`.
5. Redeploy your frontend on Vercel.

**Congratulations!** You now have a permanently free, root-access Kubernetes cluster running your security scanner!
