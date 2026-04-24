#!/bin/bash
set -e

echo "======================================"
echo "  GymPro — Client Setup"
echo "======================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker is not installed."
  echo "Install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info &> /dev/null 2>&1; then
  echo "ERROR: Docker is not running. Start Docker Desktop first."
  exit 1
fi

echo "Docker OK."
echo ""

# Collect client info
read -p "Gym Name: " GYM_NAME
read -p "Gym Phone: " GYM_PHONE
read -p "Gym Address: " GYM_ADDRESS
read -p "Branch (e.g., main, client/alpha-gym) [main]: " BRANCH
BRANCH=${BRANCH:-main}
read -p "Image Tag (e.g., latest, client-alpha-gym) [latest]: " IMAGE_TAG
IMAGE_TAG=${IMAGE_TAG:-latest}
read -p "Seed super-admin email [admin@gym.com]: " SEED_ADMIN_EMAIL
SEED_ADMIN_EMAIL=${SEED_ADMIN_EMAIL:-admin@gym.com}
read -p "Seed super-admin password [Password123]: " SEED_ADMIN_PASSWORD
SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD:-Password123}

# GHCR login
GITHUB_OWNER="sayedsafi2000"
echo ""
echo "Login to GitHub Container Registry..."
echo "You need a Personal Access Token (PAT) with read:packages scope."
read -sp "GHCR Token: " GHCR_TOKEN
echo ""
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_OWNER" --password-stdin
echo ""

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')

# Create project directory
INSTALL_DIR="$HOME/gym-pro"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download docker-compose.deploy.yml from chosen branch
echo "Downloading compose file from $BRANCH branch..."
curl -sfL "https://raw.githubusercontent.com/$GITHUB_OWNER/gym-pro/$BRANCH/docker-compose.deploy.yml" -o docker-compose.yml \
  || { echo "ERROR: could not download compose file from branch '$BRANCH'. Aborting."; exit 1; }

# Create .env
cat > .env << EOF
# GymPro Configuration — $(date)
JWT_SECRET=$JWT_SECRET

GITHUB_OWNER=$GITHUB_OWNER
BRANCH=$BRANCH
IMAGE_TAG=$IMAGE_TAG

SEED_ADMIN_EMAIL=$SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD

GYM_NAME=$GYM_NAME
GYM_ADDRESS=$GYM_ADDRESS
GYM_PHONE=$GYM_PHONE

ZKTECO_DEVICE_IP=
ZKTECO_DEVICE_PORT=4370
ATTENDANCE_POLL_INTERVAL_MS=60000

BACKUP_CRON=0 2 * * *
BACKUP_MAX_COUNT=7
GDRIVE_CLIENT_ID=
GDRIVE_CLIENT_SECRET=
GDRIVE_TOKEN=
GDRIVE_FOLDER_ID=
EOF

echo "Config saved to $INSTALL_DIR/.env"
echo ""

# Create data directories
mkdir -p data/db backups system

# --- Install host-updater (watcher that enables the in-app Update button) ---
echo ""
echo "Installing host-updater..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp "$SCRIPT_DIR/host-updater.sh" "$INSTALL_DIR/host-updater.sh"
cp "$SCRIPT_DIR/update-client.sh" "$INSTALL_DIR/update-client.sh"
chmod +x "$INSTALL_DIR/host-updater.sh" "$INSTALL_DIR/update-client.sh"

UNAME_S="$(uname -s)"
if [ "$UNAME_S" = "Darwin" ]; then
  # macOS — register launchd agent.
  PLIST_SRC="$SCRIPT_DIR/com.gympro.updater.plist"
  PLIST_DST="$HOME/Library/LaunchAgents/com.gympro.updater.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  sed "s|{{USER_HOME}}|$HOME|g" "$PLIST_SRC" > "$PLIST_DST"
  launchctl unload "$PLIST_DST" 2>/dev/null || true
  launchctl load "$PLIST_DST"
  echo "launchd agent installed: $PLIST_DST (runs every 60s)."
else
  # Linux — register cron entry if not already present.
  CRON_LINE="* * * * * $INSTALL_DIR/host-updater.sh >/dev/null 2>&1"
  if crontab -l 2>/dev/null | grep -Fq "$INSTALL_DIR/host-updater.sh"; then
    echo "cron entry already present — skipping."
  else
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "cron entry installed (runs every minute)."
  fi
fi

# Pull images
echo "Pulling images (this may take a few minutes)..."
docker compose pull
echo ""

# Start
echo "Starting GymPro..."
docker compose up -d
echo ""

# Wait for server
echo "Waiting for server to start..."
sleep 5

echo ""
echo "======================================"
echo "  GymPro Setup Complete!"
echo "======================================"
echo ""
echo "  URL:      http://localhost"
echo "  Login:    $SEED_ADMIN_EMAIL"
echo "  Password: $SEED_ADMIN_PASSWORD"
echo ""
echo "  Gym Name: $GYM_NAME"
echo "  Install:  $INSTALL_DIR"
echo "  Branch:   $BRANCH"
echo "  Tag:      $IMAGE_TAG"
echo ""
echo "  To update: ./update-client.sh"
echo "  To stop:   docker compose down"
echo "  To start:  docker compose up -d"
echo "======================================"
