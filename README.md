# SLBFE Complaint Management Portal

Web portal and backend API for SLBFE complaint management. The backend uses MySQL and includes a reset script that creates the schema and seed data needed for local development and handover testing.

Use the root README for the full-stack handover path. Backend-specific setup, API notes, and seed account details are documented in `backend/README.md`.

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

## Complaint Status Lifecycle

Complaints submitted from the mobile app enter the staff portal as `Submitted`.
From there, staff actions move the case through a defined lifecycle:

| Status | Meaning |
| --- | --- |
| `Submitted` | New issue received from the mobile app and not yet acknowledged by staff. |
| `Under Review` | Supervisor assigned the issue, or staff opened an assigned submitted issue for review. |
| `In Progress` | Case officer has started active handling after review. |
| `Awaiting Info` | Case officer is waiting for more information from the worker, employer, mission, or another party. |
| `Resolved` | A resolution or outcome has been recorded, but the case is not fully closed yet. |
| `Closed` | Final state after the resolved case is confirmed complete. |

Expected operational flow:

```text
Mobile app submission -> Submitted
Supervisor assigns case officer -> Under Review
Case officer starts handling -> In Progress
More information needed -> Awaiting Info
Outcome recorded -> Resolved
Final confirmation -> Closed
```

The seed data in [sql/schema.sql](sql/schema.sql) includes examples for all six statuses so a fresh development reset shows the complete lifecycle in the complaint list and detail pages.
