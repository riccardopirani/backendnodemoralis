#!/usr/bin/env bash
# docker-nuke.sh — remove ALL Docker containers, images, volumes, networks, and build caches.
# Usage:
#   bash docker-nuke.sh           # prompt before nuking
#   bash docker-nuke.sh -y        # no prompt (danger!)
#   bash docker-nuke.sh --keep-volumes   # keep volumes (no data loss)
#   bash docker-nuke.sh -y --keep-volumes

set -euo pipefail

YES=0
KEEP_VOLUMES=0

for arg in "$@"; do
  case "$arg" in
    -y|--yes) YES=1 ;;
    --keep-volumes) KEEP_VOLUMES=1 ;;
    -h|--help)
      echo "Usage: $0 [-y|--yes] [--keep-volumes]"
      exit 0
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found in PATH."
  exit 1
fi

echo "Current Docker disk usage:"
docker system df || true
echo

if [[ $YES -ne 1 ]]; then
  echo "This will REMOVE:"
  echo "  - all containers (running & stopped)"
  echo "  - all images"
  echo "  - all custom networks"
  if [[ $KEEP_VOLUMES -eq 0 ]]; then
    echo "  - all volumes (DATA LOSS)"
  else
    echo "  - (keeping volumes)"
  fi
  echo "  - build caches"
  read -r -p "Proceed? [type 'yes' to continue]: " CONFIRM
  [[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 1; }
fi

# Stop & remove containers
CONTAINERS="$(docker ps -aq || true)"
if [[ -n "$CONTAINERS" ]]; then
  echo "Stopping containers..."
  docker stop $CONTAINERS || true
  echo "Removing containers..."
  docker rm -f $CONTAINERS || true
else
  echo "No containers to remove."
fi

# Remove images
IMAGES="$(docker images -aq || true)"
if [[ -n "$IMAGES" ]]; then
  echo "Removing images..."
  docker rmi -f $IMAGES || true
else
  echo "No images to remove."
fi

# Remove volumes (optional)
if [[ $KEEP_VOLUMES -eq 0 ]]; then
  VOLUMES="$(docker volume ls -q || true)"
  if [[ -n "$VOLUMES" ]]; then
    echo "Removing volumes (DATA LOSS)..."
    docker volume rm $VOLUMES || true
  else
    echo "No volumes to remove."
  fi
else
  echo "Keeping volumes."
fi

# Remove custom networks (won’t remove default bridge/host/none)
NETWORKS="$(docker network ls --filter type=custom -q || true)"
if [[ -n "$NETWORKS" ]]; then
  echo "Removing custom networks..."
  docker network rm $NETWORKS || true
fi

# Prune everything unused (belt & suspenders)
echo "Pruning unused data..."
if [[ $KEEP_VOLUMES -eq 0 ]]; then
  docker system prune -a --volumes -f || true
else
  docker system prune -a -f || true
fi

# Clear BuildKit/buildx caches
echo "Pruning builder caches..."
docker builder prune -a -f || true
# If buildx is available, prune there too
if docker buildx version >/dev/null 2>&1; then
  docker buildx prune -a -f || true
fi

echo
echo "Done. Final Docker disk usage:"
docker system df || true
