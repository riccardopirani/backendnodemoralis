#!/bin/bash

echo "⚠️  WARNING: This will permanently delete ALL Docker data (containers, images, volumes, networks)!"
read -p "Are you sure you want to continue? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
fi

echo "🛑 Stopping all running containers..."
docker stop $(docker ps -q) 2>/dev/null

echo "🗑 Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null

echo "🖼 Removing all images..."
docker rmi -f $(docker images -q) 2>/dev/null

echo "📦 Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null

echo "🌐 Removing all custom networks..."
docker network rm $(docker network ls | grep -v "bridge\|host\|none" | awk 'NR>1 {print $1}') 2>/dev/null
docker builder prune -a -f

echo "🧹 Running system prune..."
docker system prune -a --volumes -f

echo "✅ Docker cleanup complete."

