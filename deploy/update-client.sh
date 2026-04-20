#!/bin/bash
set -e

echo "======================================"
echo "  GymPro — Update"
echo "======================================"
echo ""

# Find install directory
INSTALL_DIR="$HOME/gym-pro"
if [ ! -f "$INSTALL_DIR/.env" ]; then
  echo "ERROR: GymPro not found at $INSTALL_DIR"
  echo "Run setup-client.sh first."
  exit 1
fi

cd "$INSTALL_DIR"

# Read branch + tag + owner from .env
BRANCH=$(grep ^BRANCH= .env | cut -d= -f2)
BRANCH=${BRANCH:-main}
IMAGE_TAG=$(grep ^IMAGE_TAG= .env | cut -d= -f2)
GITHUB_OWNER=$(grep ^GITHUB_OWNER= .env | cut -d= -f2)
GITHUB_OWNER=${GITHUB_OWNER:-sayedsafi2000}

echo "Branch: $BRANCH"
echo "Tag:    $IMAGE_TAG"
echo ""

# Re-download compose file (structure may have changed on that branch)
echo "Refreshing compose file..."
curl -sfL "https://raw.githubusercontent.com/$GITHUB_OWNER/gym-pro/$BRANCH/docker-compose.deploy.yml" -o docker-compose.yml \
  || echo "WARNING: could not refresh compose file, using existing one."

# Pull latest images
echo "Pulling latest images..."
docker compose pull
echo ""

# Restart with new images (data preserved in volumes)
echo "Restarting containers..."
docker compose up -d --remove-orphans
echo ""

# Wait for server
sleep 5

echo "======================================"
echo "  Update Complete!"
echo "======================================"
echo ""
echo "  URL:    http://localhost"
echo "  Branch: $BRANCH"
echo "  Tag:    $IMAGE_TAG"
echo ""
echo "  Your data (members, payments, etc.) is preserved."
echo "======================================"
