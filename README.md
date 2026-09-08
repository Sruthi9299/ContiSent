# ContiSent

ContiSent is a powerful, multi-stage DevSecOps pipeline application designed to orchestrate vulnerability scanning, secret detection, SBOM generation, and kubernetes deployment testing.

## Prerequisites

To run this application locally, you only need to have the following installed on your machine:
- **Docker**
- **Docker Compose**

*Note: You do not need to install Python, Node.js, PostgreSQL, or Redis on your local machine. Docker handles everything.*

## How to Run

Running the entire application stack is extremely simple using Docker Compose.

1. **Clone the repository** (or download the files):
   ```bash
   git clone <your-repo-url>
   cd ContiSent
   ```

2. **Start the application**:
   Run the following command to build and start all necessary services in the background:
   ```bash
   docker-compose up --build -d
   ```

3. **Access the application**:
   Once the containers are built and running, you can access the different parts of the application:
   - **Frontend (Web UI)**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs

## What is happening under the hood?

When you run `docker-compose up -d`, Docker spins up several isolated, interconnected containers:
1. **db**: A PostgreSQL database container used for storing user data, scan history, and configurations.
2. **message_broker**: A Redis container used for queuing background tasks.
3. **celery_worker**: A background worker that executes the heavy security scans asynchronously without freezing the UI.
4. **backend**: A highly-performant FastAPI web server.
5. **frontend**: A React/Next.js frontend providing a beautiful dashboard interface.

## Shutting Down

When you are finished using the application, you can easily tear down the environment and stop all containers by running:
```bash
docker-compose down
```

If you want to completely erase the database data and start entirely fresh next time, run:
```bash
docker-compose down -v
```
