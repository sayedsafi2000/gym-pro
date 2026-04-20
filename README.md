# GymPro - Gym Management System

A complete gym management system with lifetime membership, subscription tracking, fingerprint attendance, store/POS, payments, and analytics.

## Features

### Membership & Subscriptions
- **Lifetime membership packages** with free months included
- Monthly access renewal after free months expire (৳800 gents / ৳1,000 ladies)
- Subscription history tracking (package purchases + monthly payments)
- Gender-based pricing (separate rates for gents/ladies)
- Automatic access blocking when monthly payment overdue
- One-click monthly payment from member details

### Member Management
- Member registration with auto-generated IDs (GYM-001, GYM-002, ...)
- Member profiles with personal info, package details, payment status
- Lifetime membership badge + subscription status tracking
- Search and filter by status (active, expiring, expired, needs monthly)
- Pending member approval workflow (admin → super_admin)

### Attendance Tracking
- ZKTeco fingerprint device integration via TCP/IP (polling-based sync)
- Manual check-in/check-out
- **Expired members blocked from check-in** (both fingerprint + manual)
- Monthly attendance calendar with color-coded days
- Stats: total visits, avg/week, session duration, streak, attendance rate
- Weekly visit trend chart

### Payments
- Full, partial, and monthly installment payment options
- Discount support (fixed amount or percentage)
- Multiple methods: Cash, bKash, Nagad, Bank Transfer
- Payment deletion recalculates member financials automatically
- Bulk delete capability

### Packages
- 5 lifetime packages with varying free months and benefits
- Configurable monthly renewal fee via GymConfig
- Gender-based pricing (priceGents / priceLadies)
- Benefits list, category (regular/special), free months display

### Store / Point of Sale
- Product inventory with category management
- Sell, restock, sale history, receipts
- Store analytics on dashboard

### Dashboard
- Real-time stats: members, income, attendance, store
- "Needs Monthly Payment" alert for lifetime members with expired access
- Income trend charts

### Admin Management
- Super admin + regular admin roles
- Permission-based access control
- Member approval workflow

## Tech Stack

- **Backend:** Node.js, Express 5, MongoDB 7 (Mongoose 9)
- **Frontend:** React 19, Vite 8, Tailwind CSS 4, Recharts
- **Auth:** JWT (7-day expiry, Bearer token)
- **Deployment:** Docker Compose, GHCR, Nginx reverse proxy
- **Backup:** mongodump + rclone (Google Drive)
- **Testing:** Playwright E2E (112 tests)

## Project Structure

```
gym-pro/
  gym-server/                    # Express REST API
    models/
      Member.js                  # Members + lifetime tracking
      Package.js                 # Membership packages (gender pricing)
      Subscription.js            # Access periods (package + monthly)
      Payment.js                 # Payment records
      Installment.js             # Monthly installment plans
      GymConfig.js               # Monthly fee config (singleton)
      Attendance.js              # Check-in/check-out logs
      Device.js                  # ZKTeco fingerprint devices
      Product.js                 # Store products
      Admin.js                   # Admin accounts
    controllers/                 # Route handlers
    routes/                      # Express routers
    services/                    # ZKTeco sync, attendance
    middleware/                  # JWT auth + role checks
    migrations/                  # One-off CLI scripts (node migrations/<file>.js)
  gym-admin-panel/               # React SPA
    src/
      pages/                     # Page components
      components/                # Shared components (ReceiptModal, etc.)
      layouts/                   # App layout with nav
      services/api.js            # Axios instance
  deploy/                        # Client deployment scripts
    setup-client.sh              # First-time client setup
    update-client.sh             # Pull latest + restart
    deploy-to-client.sh          # Push updates to client branch
  backup/                        # Automated backup system
  e2e/                           # Playwright E2E tests (112 tests)
  data/db/                       # MongoDB data (bind mount, gitignored)
  backups/                       # Backup files (gitignored)
```

## Quick Start

### Prerequisites
- Docker Desktop installed and running

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/sayedsafi2000/gym-pro.git
   cd gym-pro
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env — set JWT_SECRET at minimum
   ```

3. Start all services:
   ```bash
   docker compose up -d --build
   ```

4. Open `http://localhost`

   Login: `admin@gym.com` / `Password123`

### Development (without Docker)

**Backend:**
```bash
cd gym-server
npm install
# Set MONGO_URI and JWT_SECRET env vars
npm run dev
```

**Frontend:**
```bash
cd gym-admin-panel
npm install
npm run dev
```

### Running Tests

```bash
npm install -D @playwright/test
npx playwright install chromium
npx playwright test              # all 112 tests
npx playwright test --headed     # watch in browser
```

See [TESTING.md](TESTING.md) for full manual testing checklist (120 scenarios).

## Client Deployment

### Branch Strategy

```
main                        ← core product (all development)
├── client/abc-gym          ← client-specific config
├── client/xyz-fitness
└── ... (max 5 clients)
```

Each client gets their own branch. Only `.env` values differ (gym name, phone, address). CI builds per-branch images pushed to GHCR.

### Deploying to a Client

**Your machine (push update to client):**
```bash
./deploy/deploy-to-client.sh abc-gym
# Merges main → client/abc-gym → pushes → CI builds images
```

**Client machine (first-time setup):**

Linux / macOS / Git Bash:
```bash
bash setup-client.sh
# Prompts: gym name, phone, address, branch, image tag, seed admin creds, GHCR token
# Auto: generates JWT, pulls images, starts app
# App at http://localhost
```

Windows (PowerShell — no bash needed):
```powershell
Invoke-WebRequest -UseBasicParsing `
  https://raw.githubusercontent.com/sayedsafi2000/gym-pro/main/deploy/setup-client.ps1 `
  -OutFile setup-client.ps1
powershell -ExecutionPolicy Bypass -File .\setup-client.ps1
```

**Client machine (update):**

Linux / macOS / Git Bash:
```bash
bash update-client.sh
# Re-downloads compose from recorded branch, pulls latest images, restarts, data preserved
```

Windows:
```powershell
powershell -ExecutionPolicy Bypass -File .\update-client.ps1
```

### Auto-Start on PC Boot

1. Docker Desktop → Settings → enable "Start Docker Desktop when you log in"
2. All containers have `restart: unless-stopped`
3. PC on = app running. No manual intervention.

## Database Persistence

MongoDB data stored in `./data/db/` (bind mount). Survives:
- `docker compose down`
- `docker compose down -v`
- Docker Desktop reinstall/updates
- Can copy `data/db/` folder to USB as extra safety

## Backup System

Dedicated backup container runs alongside the app:
1. Runs `mongodump` on schedule (default: daily 2am)
2. Compresses to timestamped `.gz` file
3. Uploads to Google Drive (if configured)
4. Rotates backups (keeps last 7)

```bash
# Manual backup
docker exec gym-backup /backup.sh

# Restore from backup
docker exec -i gym-mongo mongorestore --gzip --archive --drop < ./backups/gymdb_XXXXXXXX.gz
```

See backup configuration and Google Drive setup in the [Backup section](#backup-configuration) below.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret for JWT signing |
| `GITHUB_OWNER` | Deploy | sayedsafi2000 | GHCR image owner |
| `IMAGE_TAG` | Deploy | latest | Image tag (e.g., `client-abc-gym`) |
| `GYM_NAME` | No | GymPro Fitness | Gym name on receipts/UI |
| `GYM_ADDRESS` | No | Dhaka, Bangladesh | Gym address |
| `GYM_PHONE` | No | - | Gym phone |
| `ZKTECO_DEVICE_IP` | No | - | Fingerprint device IP |
| `ZKTECO_DEVICE_PORT` | No | 4370 | Device port |
| `ATTENDANCE_POLL_INTERVAL_MS` | No | 60000 | Sync interval (ms) |
| `BACKUP_CRON` | No | `0 2 * * *` | Backup schedule |
| `BACKUP_MAX_COUNT` | No | 7 | Backups to keep |
| `GDRIVE_CLIENT_ID` | No | - | Google Drive OAuth client ID |
| `GDRIVE_CLIENT_SECRET` | No | - | Google Drive OAuth secret |
| `GDRIVE_TOKEN` | No | - | rclone token JSON |
| `GDRIVE_FOLDER_ID` | No | - | Google Drive folder ID |

## API Endpoints

### Auth
- `POST /api/auth/login` — Admin login
- `GET /api/auth/me` — Current admin profile
- `GET /api/auth/admins` — List admins (super_admin)
- `POST /api/auth/admins` — Create admin (super_admin)

### Members
- `GET /api/members` — List (search, status filter)
- `POST /api/members` — Create member + subscription
- `GET /api/members/:id` — Get member details
- `PUT /api/members/:id` — Update member / add payment
- `DELETE /api/members/:id` — Delete member
- `GET /api/members/pending` — Pending approvals (super_admin)
- `PUT /api/members/:id/approve` — Approve member (super_admin)

### Subscriptions
- `GET /api/subscriptions/member/:id` — Subscription history
- `GET /api/subscriptions/member/:id/active` — Active subscription
- `POST /api/subscriptions/renew` — Renew with package
- `POST /api/subscriptions/monthly-renew` — Monthly access payment
- `POST /api/subscriptions/:id/expire` — Force expire (super_admin)
- `POST /api/subscriptions/:id/activate` — Reactivate (super_admin)
- `GET /api/subscriptions/config` — Get monthly fee config
- `PUT /api/subscriptions/config` — Update config (super_admin)

### Payments
- `GET /api/payments` — List (optional memberId filter)
- `POST /api/payments` — Create payment
- `DELETE /api/payments/:id` — Delete (recalculates financials)
- `POST /api/payments/bulk-delete` — Bulk delete
- `GET /api/payments/:id/receipt` — Payment receipt

### Attendance
- `GET /api/attendance` — Logs (filterable)
- `GET /api/attendance/today` — Today summary
- `POST /api/attendance/manual` — Manual check-in/out (blocks expired)
- `POST /api/attendance/sync` — Trigger device sync
- `GET /api/attendance/member/:id/calendar` — Monthly calendar
- `GET /api/attendance/member/:id/stats` — Member stats

### Packages
- `GET /api/packages` — List all
- `POST /api/packages` — Create
- `PUT /api/packages/:id` — Update
- `DELETE /api/packages/:id` — Delete

### Products / Store
- `GET /api/products` — List (search, category)
- `POST /api/products` — Create
- `POST /api/products/:id/sell` — Sell
- `POST /api/products/:id/restock` — Restock
- `GET /api/products/stats` — Store stats
- `GET /api/products/sales/:id/receipt` — Sale receipt

### Devices
- `GET /api/devices` — List
- `POST /api/devices` — Register
- `POST /api/devices/:id/register-user` — Enroll member fingerprint
- `POST /api/devices/:id/link-user` — Link device user to member

## Backup Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_CRON` | `0 2 * * *` | Cron schedule (daily 2am) |
| `BACKUP_MAX_COUNT` | `7` | Backups to keep |

Common schedules: `0 2 * * *` (daily 2am), `0 */12 * * *` (every 12h), `0 2 * * 0` (weekly Sunday)

### Google Drive Setup

1. Create OAuth credentials at https://console.cloud.google.com/
2. Enable Google Drive API
3. Run `rclone config` to get token
4. Add `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `GDRIVE_TOKEN`, `GDRIVE_FOLDER_ID` to `.env`
5. Restart: `docker compose up -d backup`

## License

ISC
