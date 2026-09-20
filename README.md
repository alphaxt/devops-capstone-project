# PocketLedger Expense Tracker

PocketLedger is a Node.js, Express, EJS, and PostgreSQL expense tracker.

## Application Port

The application is available on port `3000`.

After starting the container, open:

http://localhost:3000

Health check:

http://localhost:3000/health

## Run with Docker Compose

The application and PostgreSQL database run as separate containers.

1. Copy `.env.example` to `.env`.
2. Replace the placeholder values in `.env`.
3. Start the services:

```bash
docker compose up -d --build

## CI/CD Pipeline

GitHub Actions automatically runs whenever code is pushed to the `main` branch.

The workflow:

1. Installs the Node.js dependencies.
2. Runs the automated tests.
3. Builds the Docker image.
4. Logs in to Docker Hub using GitHub Secrets.
5. Pushes `latest`, build-number, and commit-SHA image tags.

Docker Hub credentials are stored as the `DOCKERHUB_USERNAME` and
`DOCKERHUB_TOKEN` GitHub repository secrets. No registry credentials are
stored in the repository.

