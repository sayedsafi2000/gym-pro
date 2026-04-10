# GymPro - Gym Management System

A complete gym management system with member tracking, fingerprint attendance, store/POS, payments, and analytics.

## Features

### Member Management
- Member registration with auto-generated IDs (GYM-001, GYM-002, ...)
- Member profiles with personal info, package details, payment status
- Member details page with attendance calendar, stats, and payment history
- Membership progress tracking with expiry alerts
- Search and filter by status (active, expiring, expired)

### Attendance Tracking
- ZKTeco fingerprint device integration via TCP/IP (polling-based sync)
- Manual check-in/check-out for when devices are unavailable
- Monthly attendance calendar with color-coded days (present/absent)
- Attendance stats: total visits, avg/week, session duration, streak, attendance rate
- Weekly visit trend chart
- Device management with status monitoring and user linking

### Store / Point of Sale
- Product inventory with category management (Supplements, Apparel, Accessories, Equipment, Drinks)
- Sell modal with quantity picker and auto-calculated totals
- Restock functionality
- Sale history tracking with individual transaction records
- Product card grid view with stock status badges (In Stock / Low Stock / Out of Stock)
- Search and category filter with grid/table view toggle
- Store analytics: stock value, low stock alerts, daily sales

### Payments
- Full and partial payment recording with discount support (fixed or percentage)
- Multiple payment methods: Cash, bKash, Nagad, Bank Transfer
- Member financial tracking (total, paid, due amounts)
- Bulk delete capability

### Receipts
- 2-copy receipt format (Customer Copy + Office Copy)
- Gym branding header (configurable via env vars)
- Print-ready receipts for both membership payments and store sales
- Receipt access from Payments, Store, and Member Details pages

### Packages
- Create membership packages with name, duration (days), and price
- Auto-calculate member expiry dates based on package duration

### Dashboard
- Real-time stats: members, income, attendance, store performance
- Contextual alerts: expiring memberships, overdue payments, device failures
- Income trend charts (daily over 30 days)
- Member status breakdown

### UI/UX
- Consistent slate design system (documented in `gym-admin-panel/DESIGN.md`)
- Toast notifications for all actions (success/error)
- Mobile responsive with hamburger menu
- Delete confirmation modals
- Bengali Taka (৳) currency throughout

## Tech Stack

- **Backend:** Node.js, Express 5, MongoDB 7 (Mongoose 9)
- **Frontend:** React 19, Vite 8, Tailwind CSS 4, Recharts
- **Auth:** JWT (7-day expiry, Bearer token)
- **Deployment:** Docker Compose (Nginx reverse proxy)
- **Backup:** mongodump + rclone (Google Drive)

## Project Structure

```
gym-pro/
  gym-server/                  # Express REST API
    config/db.js               # MongoDB connection
    models/                    # Mongoose schemas
      Admin.js                 # Admin auth
      Member.js                # Gym members
      Package.js               # Membership packages
      Payment.js               # Payment records
      Product.js               # Store products
      Sale.js                  # Sale transactions
      Device.js                # ZKTeco devices
      Attendance.js            # Attendance logs
    controllers/               # Route handlers
    routes/                    # Express routers
    services/                  # ZKTeco sync service
    middleware/                # JWT auth middleware
    seed.js                    # Database seeder
  gym-admin-panel/             # React SPA
    src/
      pages/                   # Page components
      components/              # Shared components
      layouts/                 # App layout with nav
      services/api.js          # Axios instance
      hooks/useToast.js        # Toast notifications
    DESIGN.md                  # Design system docs
  backup/                      # Automated backup system
    Dockerfile                 # Alpine + mongodump + rclone
    entrypoint.sh              # Cron setup + rclone config
    backup.sh                  # Dump + upload + rotate
  data/db/                     # MongoDB data (bind mount, gitignored)
  backups/                     # Backup files (gitignored)
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
   # Set JWT_SECRET in .env
   ```

3. Start all services:
   ```bash
   docker compose up -d --build
   ```

4. Seed sample data (optional):
   ```bash
   docker exec gym-server node seed.js
   ```

5. Open `http://localhost` in your browser

   Login: `admin@gym.com` / `admin1234`

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

## Auto-Start on PC Boot

The system starts automatically when the client PC boots:

1. **Docker Desktop** → Settings → General → enable **"Start Docker Desktop when you log in"**
2. All containers have `restart: unless-stopped` — Docker starts them automatically
3. No manual intervention needed. PC on = app running.

## Database Persistence

MongoDB data is stored in `./data/db/` on the host filesystem (bind mount). This means:

- Data survives `docker compose down`
- Data survives `docker compose down -v` (volume removal)
- Data survives Docker Desktop reinstall
- Data survives Docker updates
- The `data/db/` folder can be manually copied to USB as extra safety

**Previous versions** used a Docker named volume (`mongo_data`) which was wiped by `docker compose down -v`. The bind mount approach is safer.

## Backup System

### How it works

A dedicated backup container (`gym-backup`) runs alongside the app. It:

1. Runs `mongodump` on a schedule (default: daily at 2am)
2. Compresses the dump into a timestamped `.gz` file (~3-5KB for a small gym)
3. Uploads to Google Drive (if configured)
4. Rotates backups — keeps the last 7, deletes oldest when a new one is created
5. Runs an initial backup on every container startup

### Backup rotation

The system keeps a fixed number of backups (default: 7). When a new backup is created and the count exceeds the limit, the oldest backup(s) are deleted. This applies to both local files and Google Drive.

Example with `BACKUP_MAX_COUNT=7`:
```
Day 1: gymdb_20260401.gz  (1 backup)
Day 2: gymdb_20260402.gz  (2 backups)
...
Day 7: gymdb_20260407.gz  (7 backups)
Day 8: gymdb_20260408.gz  (7 backups — Day 1 deleted)
Day 9: gymdb_20260409.gz  (7 backups — Day 2 deleted)
```

You always have 7 recovery points.

### Local backups (works without Google Drive)

Backups are saved to `./backups/` on the host machine even without Google Drive configured. To check:

```bash
ls ./backups/
# gymdb_20260410_020000.gz  (3.1K)
```

### Google Drive setup (optional but recommended)

#### Step 1: Create Google Cloud credentials

1. Go to https://console.cloud.google.com/
2. Create a project (or use existing)
3. Go to **APIs & Services → Library** → search **"Google Drive API"** → **Enable**
4. Go to **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**
5. Application type: **Desktop app**
6. Note down the **Client ID** and **Client Secret**

#### Step 2: Get rclone token (one-time, needs a browser)

Install rclone on your machine:
```bash
# Windows
winget install Rclone.Rclone

# Mac
brew install rclone

# Linux
curl https://rclone.org/install.sh | sudo bash
```

Run rclone config:
```bash
rclone config
```

Follow the prompts:
- `n` (new remote)
- Name: `gdrive`
- Storage type: `drive` (or type the number for Google Drive)
- Paste your **client_id**
- Paste your **client_secret**
- Scope: `1` (full access)
- Leave root_folder_id blank
- Leave service_account_file blank
- Auto config: `y` (opens browser)
- Authorize in your browser
- Not a shared drive: `n`

#### Step 3: Copy the token

After config completes, view the config:
```bash
cat ~/.config/rclone/rclone.conf
```

You'll see:
```
[gdrive]
type = drive
client_id = xxxx.apps.googleusercontent.com
client_secret = GOCSPX-xxxx
token = {"access_token":"ya29.xxx","token_type":"Bearer","refresh_token":"1//xxx","expiry":"2026-..."}
```

Copy the **client_id**, **client_secret**, and the entire **token** JSON string.

#### Step 4: Create a Google Drive folder

1. Open Google Drive in your browser
2. Create a folder called `gym-backups`
3. Open the folder
4. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/THIS_IS_THE_FOLDER_ID`

#### Step 5: Add to `.env`

```env
GDRIVE_CLIENT_ID=xxxx.apps.googleusercontent.com
GDRIVE_CLIENT_SECRET=GOCSPX-xxxx
GDRIVE_TOKEN={"access_token":"ya29.xxx","token_type":"Bearer","refresh_token":"1//xxx","expiry":"2026-..."}
GDRIVE_FOLDER_ID=the_folder_id_from_url
```

#### Step 6: Restart backup container

```bash
docker compose up --build -d backup
```

The backup container reads `.env` at startup. After restarting:
- An immediate backup runs and uploads to Drive
- Cron continues on schedule (daily 2am)
- Old backups are rotated on both local and Drive

#### Verify it works

```bash
# Trigger a manual backup
docker exec gym-backup /backup.sh

# Check logs
docker logs gym-backup --tail 20
```

You should see:
```
[...] Dump successful: gymdb_20260410_020000.gz (4.0K)
[...] Uploading to Google Drive...
[...] Uploaded to Google Drive
```

Check your Google Drive `gym-backups` folder — the `.gz` file should be there.

### Manual backup

Trigger a backup anytime:
```bash
docker exec gym-backup /backup.sh
```

### Restore from backup

If something goes wrong, restore from any backup file:

```bash
# List available backups
ls ./backups/

# Restore (replaces current database)
docker exec -i gym-mongo mongorestore --gzip --archive --drop < ./backups/gymdb_20260410_020000.gz
```

The `--drop` flag replaces the current database entirely with the backup contents.

**Restore from Google Drive:**
1. Download the `.gz` file from your `gym-backups` Drive folder
2. Place it in the `./backups/` directory
3. Run the restore command above

### Backup configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_CRON` | `0 2 * * *` | Cron schedule (default: daily 2am) |
| `BACKUP_MAX_COUNT` | `7` | Number of backups to keep |
| `GDRIVE_CLIENT_ID` | (empty) | Google OAuth client ID |
| `GDRIVE_CLIENT_SECRET` | (empty) | Google OAuth client secret |
| `GDRIVE_TOKEN` | (empty) | rclone token JSON |
| `GDRIVE_FOLDER_ID` | (empty) | Google Drive folder ID |

Common cron schedules:
- `0 2 * * *` — daily at 2am (default)
- `0 */12 * * *` — every 12 hours
- `0 */6 * * *` — every 6 hours
- `0 2 * * 0` — weekly on Sunday at 2am

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret for JWT signing |
| `PORT` | No | 5000 | API server port |
| `MONGO_URI` | No | Set by Docker | MongoDB connection string |
| `GYM_NAME` | No | GymPro Fitness | Gym name on receipts |
| `GYM_ADDRESS` | No | Dhaka, Bangladesh | Gym address on receipts |
| `GYM_PHONE` | No | - | Gym phone on receipts |
| `ZKTECO_DEVICE_IP` | No | - | Auto-seed fingerprint device |
| `ZKTECO_DEVICE_PORT` | No | 4370 | ZKTeco device port |
| `ATTENDANCE_POLL_INTERVAL_MS` | No | 60000 | Attendance sync interval (ms) |
| `BACKUP_CRON` | No | `0 2 * * *` | Backup schedule |
| `BACKUP_MAX_COUNT` | No | 7 | Backups to keep |
| `GDRIVE_CLIENT_ID` | No | - | Google Drive client ID |
| `GDRIVE_CLIENT_SECRET` | No | - | Google Drive client secret |
| `GDRIVE_TOKEN` | No | - | Google Drive rclone token |
| `GDRIVE_FOLDER_ID` | No | - | Google Drive folder ID |

## API Endpoints

### Auth (public)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Admin registration

### Members
- `GET /api/members` - List members (search, status filter)
- `POST /api/members` - Create member
- `GET /api/members/:id` - Get member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Attendance
- `GET /api/attendance` - List attendance logs (paginated, filterable)
- `GET /api/attendance/today` - Today's summary
- `POST /api/attendance/manual` - Manual check-in/check-out
- `POST /api/attendance/sync` - Trigger device sync
- `GET /api/attendance/member/:id/calendar` - Monthly calendar data
- `GET /api/attendance/member/:id/stats` - Attendance statistics
- `GET /api/attendance/member/:id/status` - Current check-in state

### Payments
- `GET /api/payments` - List payments (optional memberId filter)
- `POST /api/payments` - Create payment
- `GET /api/payments/:id/receipt` - Generate payment receipt

### Products / Store
- `GET /api/products` - List products (search, category filter)
- `POST /api/products` - Create product
- `POST /api/products/:id/sell` - Sell product (with quantity)
- `POST /api/products/:id/restock` - Restock product
- `GET /api/products/stats` - Store statistics
- `GET /api/products/sales` - Sale history
- `GET /api/products/sales/:id/receipt` - Sale receipt

### Devices
- `GET /api/devices` - List devices
- `POST /api/devices` - Register device
- `GET /api/devices/:id/status` - Check device connection
- `POST /api/devices/:id/register-user` - Register member on device
- `POST /api/devices/:id/link-user` - Link device user to member
- `GET /api/devices/:id/users` - List device users

### Dashboard
- `GET /api/dashboard/stats` - All dashboard statistics
- `GET /api/dashboard/alerts` - Contextual alerts

## Deployment

### Local (Docker Compose)
```bash
docker compose up -d --build
```
Frontend on `:80`, API on `:5000` (internal), MongoDB on `:27017` (internal).

### Production (GHCR Images)
GitHub Actions builds multi-arch images on push to `main`:
- `ghcr.io/<owner>/gym-server:latest`
- `ghcr.io/<owner>/gym-admin-panel:latest`

On the production server:
```bash
docker login ghcr.io
# Set GITHUB_OWNER, IMAGE_TAG, JWT_SECRET in .env
docker compose -f docker-compose.deploy.yml up -d
```

### Client PC Deployment Checklist

1. Install Docker Desktop
2. Enable "Start Docker Desktop when you log in" in Settings
3. Copy project files (or use `docker-compose.deploy.yml` with GHCR images)
4. Create `.env` with JWT_SECRET (and optionally Google Drive credentials)
5. Run `docker compose up -d --build`
6. Seed initial data: `docker exec gym-server node seed.js`
7. Open `http://localhost` — done

From then on: PC boots → Docker starts → app + backups run automatically.

## License

ISC
