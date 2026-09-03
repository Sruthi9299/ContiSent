# ContiSent - Setup & Run Guide

This guide provides step-by-step instructions on how to set up and run the application locally from scratch. 

## 📦 What to Download (Prerequisites)

If you are setting this up manually without Docker, you will need to download and install the following tools:

1. **Python (v3.10 or higher)**: Required for the backend. [Download Python](https://www.python.org/downloads/)
2. **Node.js (v18 or higher)**: Required for the frontend Next.js app. [Download Node.js](https://nodejs.org/)
3. **PostgreSQL (v15 or higher)**: The database used by the application. [Download PostgreSQL](https://www.postgresql.org/download/)
4. **Git**: Version control (optional but recommended). [Download Git](https://git-scm.com/downloads)
5. *(Backend specific tools)*: The backend requires `trivy` and `syft` for container security scanning. 
   - [Install Trivy](https://aquasecurity.github.io/trivy/latest/getting-started/installation/)
   - [Install Syft](https://github.com/anchore/syft#installation)

---

## 🚀 The Easy Way: Using Docker (Recommended)

If you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed, you can skip the manual setup and start the entire application with a single command.

1. Open a terminal in the root of the project (the folder containing `docker-compose.yml`).
2. Run the following command:
   ```bash
   docker-compose up --build
   ```
3. Wait for the containers to build and start. The application will be available at:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000/docs (Swagger UI)

---

## 🛠️ The Manual Way: Step-by-Step Setup

If you do not have Docker or prefer to run the services directly on your machine, follow these steps.

### Step 1: Database Setup
1. Install and start your local PostgreSQL server.
2. Create a new database named `contisent`. You can do this via a GUI tool like pgAdmin or the command line:
   ```bash
   createdb -U postgres ContiSent
   ```

### Step 2: Backend Setup
The backend is a Python FastAPI application.

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment to isolate dependencies:
   ```bash
   # On Windows
   python -m venv venv
   
   # On Mac/Linux
   python3 -m venv venv
   ```
3. Activate the virtual environment:
   ```bash
   # On Windows
   venv\Scripts\activate
   
   # On Mac/Linux
   source venv/bin/activate
   ```
4. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
5. Set up the environment variables:
   - Copy `.env.example` to a new file named `.env`.
   - Update the `SQLALCHEMY_DATABASE_URI` in `.env` to match your local PostgreSQL credentials (e.g., `postgresql+psycopg://<your-db-user>:<your-db-password>@localhost:5432/contisent`).
6. Run database migrations to create the required tables:
   ```bash
   alembic upgrade head
   ```
7. (Optional) Seed the database with initial data:
   ```bash
   python seed.py
   ```
8. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The backend is now running at `http://localhost:8000`.*

### Step 3: Frontend Setup
The frontend is a Next.js React application.

1. Open a **new** terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *The frontend is now running at `http://localhost:3000`.*

---

## 🌐 Accessing the Application

Once both the backend and frontend servers are running:
- **Web App**: Open your browser and go to [http://localhost:3000](http://localhost:3000)
- **API Documentation**: Go to [http://localhost:8000/docs](http://localhost:8000/docs) to view and test the backend endpoints.
