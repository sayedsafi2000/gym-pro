#!/bin/bash
set -e

# Run this on YOUR machine to push updates to a client branch.
# Usage: ./deploy-to-client.sh abc-gym

if [ -z "$1" ]; then
  echo "Usage: ./deploy-to-client.sh <client-name>"
  echo "Example: ./deploy-to-client.sh abc-gym"
  echo ""
  echo "This merges main into client/<client-name> and pushes."
  echo "CI will build and push new images tagged client-<client-name>."
  exit 1
fi

CLIENT="$1"
BRANCH="client/$CLIENT"

echo "Deploying main → $BRANCH"
echo ""

# Make sure main is up to date
git checkout main
git pull origin main

# Switch to client branch (create if doesn't exist)
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
  # Sync with remote first so client-side compose edits aren't lost and push
  # doesn't get rejected as non-fast-forward.
  git pull origin "$BRANCH" --no-rebase --no-edit || true
else
  echo "Branch $BRANCH doesn't exist. Creating from main..."
  git checkout -b "$BRANCH"
fi

# Merge main into client branch
echo "Merging main → $BRANCH..."
git merge main --no-edit -m "chore: merge main into $BRANCH"

# Push
echo "Pushing $BRANCH..."
git push -u origin "$BRANCH"

# Switch back to main
git checkout main

echo ""
echo "======================================"
echo "  Deployed to $BRANCH"
echo "======================================"
echo "CI will build images tagged: client-$CLIENT"
echo "Client runs: ./update-client.sh to pull latest"
echo "======================================"
