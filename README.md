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

