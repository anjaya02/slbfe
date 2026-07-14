# SLBFE Backend

Express.js + MySQL backend for the SLBFE complaint management system.

This backend is the API layer used by the Angular frontend in the `frontend/` folder. It provides authentication, user management, complaints, dashboard stats, reports, and notifications.

The local reset workflow uses the shared schema in `../sql/schema.sql`, so database structure and demo seed data stay in one place.

## Stack

- Node.js
- Express.js
- MySQL 8+
- JWT authentication
- `mysql2` for database access

## Project Structure

```text
backend/
├── .env.example
├── package.json
├── src/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── repositories/
│   │   ├── complaint.repository.js
│   │   ├── notification.repository.js
│   │   └── user.repository.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── complaint.routes.js
│   │   ├── misc.routes.js
│   │   └── user.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── complaint.service.js
│   │   ├── notification.service.js
│   │   └── user.service.js
│   ├── utils/
│   │   ├── app-error.js
│   │   ├── async-handler.js
│   │   └── id.js
│   └── index.js
```

## Setup

### 1. Install dependencies

From the `backend/` folder:

```bash
npm install
```

### 2. Create the environment file

Copy `.env.example` to `.env` and review the values:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=admin
DB_NAME=slbfe
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=7
CORS_ORIGIN=http://localhost:4200
```

Important:

- the backend now loads `.env` from the `backend/` root explicitly
- if you change the MySQL port, update `DB_PORT`
- XAMPP is not required for this project unless you specifically want to use its MySQL instance

### 3. Reset and seed the database

From the `backend/` folder you can drop, recreate, and seed the local `slbfe` database:

```bash
npm run db:reset
```

You can also run [../sql/schema.sql](../sql/schema.sql) directly in MySQL Workbench or another MySQL client.

This creates:

- `consular_users`
- `auth_refresh_tokens`
- `complain_details`
- `complain_comments`
- `complain_logs`
- `complain_catagory`
- `resolution_catagory`
- `migrant_employees`
- `complaint_assignments`
- `complaint_attachments`
- `notifications`

The backend auto-creates runtime support tables at startup if they do not exist yet.

It also seeds a default supervisor account:

- email: `admin@slbfe.gov.lk`
- password: `Admin@1234`

It also seeds a default case officer account, lookup rows, migrant employee rows, and demo complaint data:

- email: `officer@slbfe.gov.lk`
- password: `Officer@1234`
- 4 demo complaints in `complain_details`
- complaint logs and comments for each seeded complaint
- notification rows tied to seeded complaint activity

### 4. Start the server

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Run tests:

```bash
npm test
```

The server runs at:

```text
http://localhost:5000
```

## MySQL Notes

The verified local setup currently uses MySQL on `3306`.

Use one MySQL server only:

- `3306` if you are using MySQL Workbench / MySQL80

## API Overview

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login and receive JWT + refresh token |
| POST | `/api/auth/refresh` | Rotate refresh token and issue a new access token |
| POST | `/api/auth/logout` | Revoke the current refresh token |
| GET | `/api/auth/me` | Get the current user |
| PATCH | `/api/auth/me/profile` | Update the current user profile |
| PATCH | `/api/auth/me/preferences` | Update notification/date preferences |
| PATCH | `/api/auth/me/password` | Change the current user's password |

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List users, supervisor only |
| GET | `/api/users/case-officers` | List active case officers, supervisor only |
| GET | `/api/users/:id` | Get one user, supervisor only |
| POST | `/api/users` | Create a user, supervisor only |
| PATCH | `/api/users/:id` | Update a user, supervisor only |
| PATCH | `/api/users/:id/status` | Activate/deactivate a user, supervisor only |

### Complaints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/complaints` | List complaints with filters and pagination; case officers see assigned complaints only |
| GET | `/api/complaints/:id` | Get complaint detail; case officers can access assigned complaints only |
| PATCH | `/api/complaints/:id/status` | Update complaint status |
| PATCH | `/api/complaints/:id/assignment` | Assign complaint to an officer, supervisor only |
| POST | `/api/complaints/:id/notes` | Add a complaint note |

### Dashboard and Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Dashboard KPIs and chart data |
| POST | `/api/reports/generate` | Generate a report payload, supervisor only |

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | List notifications for the current user |
| GET | `/api/notifications/unread-count` | Get unread notification count |
| PATCH | `/api/notifications/:id/read` | Mark one notification as read |
| PATCH | `/api/notifications/read-all` | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | Delete one notification |
| DELETE | `/api/notifications` | Clear all notifications |

## How It Works

### Architecture

The backend follows a simple layered structure:

- routes handle HTTP requests and response codes
- services contain business logic
- repositories are the only layer that talks to MySQL
- middleware handles authentication and role checks

### Data flow

1. Angular calls an API route.
2. The route validates the request and forwards it to a service.
3. The service applies business rules.
4. The service calls a repository.
5. The repository runs SQL against MySQL.
6. The result is mapped back into the shape expected by the frontend.

## Important Implementation Details

- JWT bearer auth is used for protected routes.
- Refresh tokens are stored server-side, rotated on refresh, and revoked on logout.
- Role checks are enforced server-side for supervisor-only actions.
- The backend uses a real MySQL pool with named placeholders.
- Complaint details, logs, and comments use `complain_details`, `complain_logs`, and `complain_comments`.
- Assignments, attachments, notifications, and app users are stored in support tables.
- Dashboard stats and reports are derived from complaint data, not stored as separate tables.
- Complaint access is role-aware: supervisors can see all complaints, case officers are limited to complaints assigned to them.
- Dashboard stats are role-aware: supervisors see global metrics, case officers see their assigned workload only.
- Reports and user management APIs are restricted to supervisors.

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Backend port |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT expiry duration |
| `CORS_ORIGIN` | Allowed frontend origin |

## Frontend Integration

The Angular app expects these response shapes:

- login returns `{ token, refreshToken, user }`
- complaint list returns `{ data, total }`
- complaint detail returns the full complaint object with attachments, history, and notes
- dashboard stats return complaint summary/chart data
- notifications return a list of notification objects
- notification unread count returns `{ unreadCount }`
- reports return a fully computed report object

## Development Notes

- The backend is currently functional and boots successfully.
- If the database is not reachable, check `backend/.env` first.
- If authentication fails for the seed account, rerun `sql/schema.sql` so the seeded hash matches the current backend.
- If port `5000` is already in use, stop the existing backend process before starting another server instance.

## Handover Notes

- The Angular frontend is already wired to this backend for auth, complaints, dashboard, notifications, reports, and user management.
- Seeded test users:
	- Supervisor: `admin@slbfe.gov.lk` / `Admin@1234`
	- Case officer: `officer@slbfe.gov.lk` / `Officer@1234`
- Role-aware behavior:
	- supervisors see global dashboard metrics and all complaints
	- case officers see assigned-only dashboard metrics and only their assigned complaints
	- complaint assignment remains supervisor-only
	- reports and user management remain supervisor-only

## Suggested Next Steps

1. Add real file upload and object-storage integration for complaint attachments.
2. Add formal database migration tooling before changing shared tables used by the mobile app.
3. Confirm the final mobile API contract before adding new mobile-specific fields to shared complaint tables.
