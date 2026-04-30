# SLBFE Complaint Management Portal

Web portal and backend API for SLBFE complaint management. The backend uses MySQL and includes a reset script that creates the schema and seed data needed for local development and handover testing.

## Repository Layout

```text
backend/   Express.js API, MySQL repositories, seed/reset scripts, API tests
frontend/  Angular web portal
sql/       MySQL schema and seed data
```

## Backend Handover

Start with [backend/README.md](backend/README.md). It includes the backend setup steps, environment variables, database reset command, seeded login accounts, API overview, and implementation notes.

Common backend commands:

```bash
cd backend
npm install
npm run db:reset
npm run dev
npm test
```

Default local API URL:

```text
http://localhost:5000
```

Seeded users:

```text
Supervisor:   admin@slbfe.gov.lk / Admin@1234
Case officer: officer@slbfe.gov.lk / Officer@1234
```

## Frontend

```bash
cd frontend
npm install
npm start
```

Default Angular URL:

```text
http://localhost:4200
```

The frontend reads the backend URL from `frontend/src/environments/environment.ts`.

## Database

The backend reset command runs [sql/schema.sql](sql/schema.sql), which drops and recreates the local `slbfe` database. Use it only for local development or fresh handover setup, not against a shared environment with real data.
