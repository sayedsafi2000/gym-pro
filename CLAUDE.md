# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GymPro is a gym management system with lifetime membership, subscription tracking, and fingerprint attendance:
- **gym-server/** — Express.js 5 REST API (CommonJS, Node 20)
- **gym-admin-panel/** — React 19 SPA (Vite 8, Tailwind CSS 4)
- **MongoDB 7** via Mongoose 9

## Business Model

- Every package = **lifetime membership + X free months**
- After free months expire → member pays **monthly fee** (৳800 gents / ৳1,000 ladies) via GymConfig
- Lifetime membership is **never lost** — just gym access blocked until monthly paid
- Monthly Prepaid is NOT a package — it's the renewal mechanism

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
```

### Testing
```bash
npx playwright test              # Run all 112 E2E tests
npx playwright test --headed     # Watch in browser
npx playwright test -g "monthly" # Run specific test by name
```

## Architecture

### Request Flow
Browser → **Nginx (:80)** → static files (React SPA) or `/api/*` proxy → **Express (:5000)** → **MongoDB (:27017)**

### Backend Models (gym-server/models/)
- `Member.js` — person + lifetime membership tracking (hasLifetimeMembership, freeMonthsEndDate)
- `Package.js` — pricing config (priceGents/priceLadies, freeMonths, isLifetime, benefits)
- `Subscription.js` — access periods (type: 'package' | 'monthly', status: active/expired/cancelled)
- `Payment.js` — financial records (paymentType: full/partial/monthly/monthly_renewal)
- `Installment.js` — monthly installment plans with schedule
- `GymConfig.js` — singleton: monthly fee rates + access days
- `Attendance.js` — check-in/check-out records
- `Device.js` — ZKTeco fingerprint devices
- `Admin.js` — admin accounts (super_admin / admin roles)
- `Product.js` — store products

### Key Relationships
```
Package → Member.packageId (which package they bought)
Member → Subscription (1 active, many historical)
Subscription → Payment (linked via subscriptionId)
Member.expiryDate = current access end (free months end OR last monthly + 30 days)
Member.hasLifetimeMembership = permanent flag (never removed)
```

### Controllers
- `memberController.js` — CRUD + lifetime expiry calculation on create
- `subscriptionController.js` — renew, monthly-renew, expire, activate, syncMemberFields
- `paymentController.js` — CRUD + recalculateMemberFinancials on delete
- `attendanceController.js` — manual check-in (blocks expired members)
- `dashboardController.js` — stats including needsMonthlyRenewal count

### Auth
- JWT-based, two roles: super_admin + admin
- Token in localStorage, 7-day expiry, HS256
- authMiddleware.js: protect (JWT), requireRole, requirePermission
- Expired members blocked from check-in (manual + fingerprint sync)

### Frontend Pages (gym-admin-panel/src/pages/)
- `MemberDetails.jsx` — lifetime badge, "Pay Monthly" button, subscription history, renewal modal
- `AddMember.jsx` — package selection with gender pricing, free months preview
- `Packages.jsx` — CRUD with gents/ladies prices, admission fee, free months
- `Payments.jsx` — gender-aware pricing, quick-fill buttons, discount support
- `Dashboard.jsx` — stats + "Needs Monthly Payment" card

## Environment Variables

Required in `.env`:
```
JWT_SECRET=<secret>
```

Docker Compose auto-sets PORT=5000, MONGO_URI. See `.env.example` for all options.

Gym branding: `GYM_NAME`, `GYM_ADDRESS`, `GYM_PHONE` — shown on receipts.

## Deployment

### Per-Client Branches
```
main                    ← core product
├── client/abc-gym      ← client .env config
├── client/xyz-fitness
└── ...
```

CI builds images per branch: `main` → `latest`, `client/abc-gym` → `client-abc-gym`.

### Deploy Scripts (deploy/)
- `setup-client.sh` — first-time client setup (prompts for gym info, pulls images)
- `update-client.sh` — pull latest + restart (data preserved)
- `deploy-to-client.sh` — YOUR script: merges main → client branch + pushes

### CI/CD
GitHub Actions (`.github/workflows/publish-ghcr.yml`) builds multi-arch images on push to `main` and `client/*` branches. Published to GHCR (private).

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

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

Codex will review your output once you are done.
