# SLBFE — Complaint Management System

> **Sri Lanka Bureau of Foreign Employment**
> Ministry of Foreign Affairs, Foreign Employment & Tourism — Consular Affairs Division

Angular 17 front-end for managing citizen complaints, case tracking, reporting, and officer workflows.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Angular 17.3 |
| UI Components | Angular Material 17.3 |
| Charts | Chart.js 4.4 + ng2-charts 5.0 |
| i18n | @ngx-translate/core 15 (English · Sinhala · Tamil) |
| Styling | SCSS + CSS Custom Properties (fixed light theme) |
| Build | Angular CLI 17.3 |

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

## Getting Started

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start development server
ng serve            # http://localhost:4200
# or, if Angular CLI is not installed globally:
npx @angular/cli@17.3.17 serve
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Supervisor | `admin@slbfe.gov.lk` | `admin123` |
| Case Officer | `officer@slbfe.gov.lk` | `officer123` |

## Build

```bash
# Development
ng build --configuration=development

# Production
ng build --configuration=production
```

Output is placed in `dist/slbfe-frontend/`.

## Project Structure

```
src/
├── app/
│   ├── core/                    # Singleton services & guards
│   │   ├── guards/              # AuthGuard, RoleGuard
│   │   ├── interceptors/        # AuthInterceptor (JWT token injection)
│   │   ├── models/              # TypeScript interfaces (User, Complaint, Report …)
│   │   └── services/            # AuthService, ComplaintService, NotificationService, SettingsService
│   │
│   ├── features/                # Lazy-loadable feature modules
│   │   ├── auth/                # Login page (split-screen branding + form)
│   │   ├── dashboard/           # KPI cards, Chart.js bar/line/doughnut charts
│   │   ├── complaints/          # Complaint list (table + filters) & detail (stepper, timeline)
│   │   ├── notifications/       # Notification list with mark-read actions
│   │   ├── profile/             # Profile edit modal
│   │   └── reports/             # Report generator with filters, summary cards, charts
│   │
│   ├── shared/                  # Reusable UI pieces
│   │   ├── components/          # HeaderComponent, SidebarComponent
│   │   ├── directives/          # ClickOutsideDirective
│   │   └── pipes/               # TimeAgoPipe, StatusColorPipe
│   │
│   ├── layout/                  # Main layout wrapper (header + sidebar + router-outlet)
│   ├── app.module.ts            # Root NgModule
│   └── app-routing.module.ts    # Route definitions with guards
│
├── assets/
│   ├── i18n/                    # en.json, si.json, ta.json
│   └── styles/
│       ├── _variables.scss      # Design tokens (colours, spacing, typography)
│       └── _themes.scss         # CSS custom properties (light-only)
│
├── index.html
├── main.ts
└── styles.scss                  # Global resets & utility imports
```

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#1E40AF` | Navigation, primary buttons, branding |
| Success Green | `#10B981` | Status badges, action buttons, accent stripe |
| Accent Blue | `#00AEEF` | Links, information highlights |
| White | `#FFFFFF` | Backgrounds, cards |

> There is **no dark mode** — the application uses a fixed light theme.

## Key Screens

| # | Screen | Route |
|---|--------|-------|
| 1 | Login | `/login` |
| 2 | Dashboard | `/dashboard` |
| 3 | Complaint List | `/complaints` |
| 4 | Complaint Detail | `/complaints/:id` |
| 5 | Notifications | `/notifications` |
| 6 | Reports | `/reports` |
| 7 | Profile Modal | (overlay) |
| 8 | Settings Modal | (overlay) |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server on port 4200 |
| `npm run build` | Production build |
| `npm run watch` | Build in watch mode |
| `npm test` | Unit tests (Karma) |

## Notes

- `--legacy-peer-deps` is required during `npm install` due to peer-dependency version ranges between Angular Material 17 and ng2-charts 5.
- `downlevelIteration` has been removed from `tsconfig.json` — it is unnecessary with `target: ES2022`.
- `"ignoreDeprecations": "6.0"` silences TypeScript 6.x+ warnings for deprecated options (`baseUrl`, `moduleResolution: "node"`) that are still required by Angular 17's build toolchain.

---

© 2026 Sri Lanka Bureau of Foreign Employment. All rights reserved.
