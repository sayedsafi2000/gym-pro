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

# Read current tag
IMAGE_TAG=$(grep IMAGE_TAG .env | cut -d= -f2)
echo "Current tag: $IMAGE_TAG"
echo ""

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
echo "  URL:  http://localhost"
echo "  Tag:  $IMAGE_TAG"
echo ""
echo "  Your data (members, payments, etc.) is preserved."
echo "======================================"
