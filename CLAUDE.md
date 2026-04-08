# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GymPro is a gym management system with two independent apps deployed together via Docker Compose:
- **gym-server/** — Express.js 5 REST API (CommonJS, Node 20)
- **gym-admin-panel/** — React 19 SPA (Vite 8, Tailwind CSS 4)
- **MongoDB 7** via Mongoose 9

## Common Commands

### Full stack (Docker)
```bash
docker compose up --build        # Start all services (frontend on :80, API on :5000, Mongo on :27017)
docker compose down              # Stop all services
```

### Backend (gym-server/)
```bash
cd gym-server
npm run dev                      # Start with nodemon (requires MONGO_URI, JWT_SECRET env vars)
npm start                        # Production start
```

### Frontend (gym-admin-panel/)
```bash
cd gym-admin-panel
npm run dev                      # Vite dev server with HMR
npm run build                    # Production build
npm run lint                     # ESLint
npm run preview                  # Preview production build
```

### No test framework is configured in either service.

## Architecture

### Request Flow
Browser → **Nginx (:80)** → static files (React SPA) or `/api/*` proxy → **Express (:5000)** → **MongoDB (:27017)**

Nginx serves the SPA with a `try_files` fallback to `index.html` and reverse-proxies `/api/` to the backend. This means frontend and backend share the same origin — no CORS issues in production.

### Backend Structure (gym-server/)
- `server.js` — app setup, middleware registration, route mounting under `/api/`
- `config/db.js` — Mongoose connection
- `models/` — Mongoose schemas: Admin, Member, Package, Payment
- `controllers/` — request handlers (auth, member, package, payment, dashboard)
- `routes/` — Express routers mapped to controllers
- `middleware/authMiddleware.js` — JWT Bearer token verification

All routes except `/api/auth/login` and `/api/auth/register` require the auth middleware.

### Frontend Structure (gym-admin-panel/)
- `src/App.jsx` — React Router v7 setup with `PrivateRoute` wrapper
- `src/pages/` — page components (Login, Register, Dashboard, MembersList, AddMember, EditMember, Packages, Payments)
- `src/services/api.js` — Axios instance with JWT interceptor (auto-attaches Bearer token)
- `src/utils/auth.js` — localStorage token helpers (key: `gym_pro_admin_token`)
- `src/layouts/Layout.jsx` — navigation header + Outlet

### Auth Flow
JWT-based, single admin role. Token stored in localStorage, 7-day expiry, HS256 signing. Axios interceptor auto-attaches the token to all API requests.

### Member ID Generation
Members get auto-generated IDs like "GYM-001", "GYM-002" — see the `Member` model's pre-save hook.

### Payment System
Payments track original amount, discount (fixed or percentage), final amount, and payment method (Cash, bKash, Nagad, Bank Transfer). Member model maintains running totals (totalAmount, paidAmount, dueAmount).

## Environment Variables

Required in `.env` (see `.env.example`):
```
JWT_SECRET=<secret>
```

Docker Compose auto-sets `PORT=5000`, `MONGO_URI=mongodb://mongo:27017/gymdb` for the backend container.

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

## CI/CD

GitHub Actions (`.github/workflows/publish-ghcr.yml`) builds multi-arch Docker images on push to `main` and publishes to GHCR. Production deployment uses `docker-compose.deploy.yml` with GHCR images.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
