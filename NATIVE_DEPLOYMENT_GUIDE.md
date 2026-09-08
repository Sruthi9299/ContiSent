# Native Bare-Metal Deployment Guide

This guide walks you through deploying the ContiSent application directly on a Linux server (e.g., Ubuntu 22.04 LTS) **without** using Docker. You will act as the system administrator, installing and managing all dependencies and services.

## Prerequisites
- A Linux server (Ubuntu/Debian recommended) with `sudo` access.
- At least 4GB of RAM and 2 CPU cores.
- A domain name pointing to your server's IP address (optional but recommended for SSL).

---

## Step 1: Install System Dependencies

First, update your server and install the core infrastructure: PostgreSQL, Redis, Node.js, Python, and Nginx.

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Python, Redis, Nginx, and build essentials
sudo apt install -y python3.11 python3.11-venv python3-pip redis-server nginx curl software-properties-common

# Install PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager for keeping apps running in the background)
sudo npm install -g pm2
```

---

## Step 2: Configure the Database

Secure PostgreSQL and create the application database.

```bash
# Switch to the postgres user and open the SQL shell
sudo -i -u postgres psql

# Run these SQL commands inside the prompt:
CREATE DATABASE contisent;
CREATE USER contisent_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE contisent TO contisent_user;
\c contisent
GRANT ALL ON SCHEMA public TO contisent_user;
\q
```

---

## Step 3: Deploy the Backend (FastAPI)

1. **Clone the code to your server**:
   ```bash
   cd /var/www
   sudo git clone <your-repo-url> contisent
   sudo chown -R $USER:$USER /var/www/contisent
   cd contisent/backend
   ```

2. **Set up the Python Environment**:
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```bash
   nano .env
   ```
   *Add the following:*
   ```env
   SQLALCHEMY_DATABASE_URI=postgresql+psycopg://contisent_user:your_secure_password@localhost:5432/contisent
   SECRET_KEY=generate_a_very_random_secret_string_here
   CELERY_BROKER_URL=redis://localhost:6379/0
   CELERY_RESULT_BACKEND=redis://localhost:6379/0
   ```

4. **Start Backend using PM2**:
   ```bash
   pm2 start "venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000" --name "fastapi-backend"
   ```

---

## Step 4: Deploy the Background Worker (Celery)

Celery is required to run the heavy security scans in the background. Ensure you are still in the `backend/` directory.

```bash
pm2 start "venv/bin/celery -A app.worker.celery_app worker --loglevel=info" --name "celery-worker"
```

---

## Step 5: Deploy the Frontend (Next.js)

1. **Navigate to the frontend folder**:
   ```bash
   cd /var/www/contisent/frontend
   ```

2. **Install dependencies and Build**:
   ```bash
   npm install
   
   # Important: Tell the frontend where the backend API lives
   export NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   
   npm run build
   ```

3. **Start Frontend using PM2**:
   ```bash
   pm2 start "npm run start" --name "nextjs-frontend"
   
   # Save PM2 processes so they restart on server reboot
   pm2 save
   pm2 startup
   ```

---

## Step 6: Configure Nginx (Reverse Proxy)

We use Nginx to route external internet traffic on port 80/443 to our internal PM2 processes running on ports 3000 and 8000.

1. **Create a new Nginx config**:
   ```bash
   sudo nano /etc/nginx/sites-available/contisent
   ```

2. **Paste the following configuration**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com; # Replace with your IP if you don't have a domain

       # Route API traffic to FastAPI
       location /api/ {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Route all other traffic to Next.js
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable the site and restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/contisent /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Step 7: (Optional) Secure with SSL using Let's Encrypt

If you are using a domain name, you should secure your site with HTTPS.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### Congratulations!
Your application is now running natively on the server. The database, Redis cache, Next.js frontend, FastAPI backend, and background workers are all active and securely routed behind Nginx.
