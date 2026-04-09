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

## License

ISC
