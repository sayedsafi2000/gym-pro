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
read -p "Image Tag (e.g., client-abc-gym or latest): " IMAGE_TAG
IMAGE_TAG=${IMAGE_TAG:-latest}

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

# Download docker-compose.deploy.yml if not present
if [ ! -f docker-compose.yml ]; then
  echo "Downloading docker-compose.yml..."
  curl -sL "https://raw.githubusercontent.com/$GITHUB_OWNER/gym-pro/main/docker-compose.deploy.yml" -o docker-compose.yml \
    || echo "Could not download compose file. Please copy docker-compose.deploy.yml to $INSTALL_DIR/docker-compose.yml"
fi

# Create .env
cat > .env << EOF
# GymPro Configuration — $(date)
JWT_SECRET=$JWT_SECRET

GITHUB_OWNER=$GITHUB_OWNER
IMAGE_TAG=$IMAGE_TAG

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
mkdir -p data/db backups

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
echo "  Login:    admin@gym.com"
echo "  Password: Password123"
echo ""
echo "  Gym Name: $GYM_NAME"
echo "  Install:  $INSTALL_DIR"
echo "  Tag:      $IMAGE_TAG"
echo ""
echo "  To update: ./update-client.sh"
echo "  To stop:   docker compose down"
echo "  To start:  docker compose up -d"
echo "======================================"
