# The Ultimate Free Architecture Deployment Guide

This guide walks you through deploying ContiSent using the modern, $0/month architecture we discussed.

**The Architecture:**
1. **GitHub Actions**: Handles Docker builds, Trivy scans, Syft SBOMs, and Kubernetes testing.
2. **Supabase**: Serverless Postgres Database.
3. **Render**: Hosts the FastAPI Backend.
4. **Vercel**: Hosts the Next.js Frontend.

*(Note: In this architecture, Redis/Upstash and Celery are no longer strictly required because GitHub Actions handles the background processing!)*

---

### Step 1: Push your code to GitHub
For GitHub Actions to work, your code must be in a GitHub repository.
1. Create a new repository on GitHub.
2. Push this entire `ContiSent` folder to that repository.
3. Once pushed, click the **Actions** tab in your GitHub repository. You will see the new `Security Scan Pipeline` I created for you.

---

### Step 2: Setup the Database (Supabase)
1. Go to [Supabase](https://supabase.com/) and sign up with GitHub.
2. Click **New Project** and create your database.
3. Generate a password and **save it safely**.
4. Go to **Project Settings -> Database** -> **Connection string** (select URI).
5. Copy the connection string. This is your `DATABASE_URL`.

---

### Step 3: Deploy the Backend (Render)
1. Go to [Render](https://render.com/) and sign up with GitHub.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `ContiSent` repository.
4. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Instance Type**: Free
5. Scroll down to **Environment Variables** and add:
   - `DATABASE_URL` = [Your Supabase Connection String]
   - `SECRET_KEY` = [Type any random string]
6. Click **Deploy Web Service**.
7. Wait for the deployment to finish and copy your Render URL (e.g., `https://contisent-backend.onrender.com`).

---

### Step 4: Deploy the Frontend (Vercel)
1. Go to [Vercel](https://vercel.com/) and sign up with GitHub.
2. Click **Add New...** -> **Project**.
3. Import your `ContiSent` repository from GitHub.
4. Configure the Project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
5. Open **Environment Variables** and add:
   - `NEXT_PUBLIC_API_URL` = `https://contisent-backend.onrender.com/api/v1` *(Use your actual Render URL!)*
6. Click **Deploy**. Vercel will give you a public URL (e.g., `https://contisent-dashboard.vercel.app`).

---

### Step 5: Link Vercel to Render (CORS)
1. Go back to your backend Web Service on **Render**.
2. Go to the **Environment** tab.
3. Add the `ALLOWED_ORIGINS` variable:
   - `ALLOWED_ORIGINS` = `https://contisent-dashboard.vercel.app` *(replace with your actual Vercel URL)*
6. Click **Save Changes**.
   
---

### Step 6 (Optional): Real-World Email Setup
If you want the application to actually send OTPs and Password Reset emails to users in the real world, you need an SMTP server. The easiest free way is using a Gmail App Password:

1. Go to your **Google Account settings** -> **Security**.
2. Enable **2-Step Verification** (if not already on).
3. Search for **App Passwords** in the Google Security settings.
4. Create a new App Password (name it "ContiSent Render"). It will give you a 16-letter code.
5. Go back to your **Render Dashboard** -> **Environment**.
6. Add the following variables:
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `your-gmail@gmail.com`
   - `SMTP_PASSWORD` = `[your-16-letter-app-password]` (No spaces)
   - `EMAILS_FROM_EMAIL` = `your-gmail@gmail.com`
7. Save changes. The backend will now send real emails!

---

### You are done! 🎉
When someone submits a request on your Vercel frontend, your Render backend receives it and stores it in Supabase. The backend can then easily trigger the GitHub Actions pipeline, which spins up a free runner, builds Docker, runs Trivy, tests it on Kubernetes (`kind`), and sends the results back!
