#!/bin/bash

# JetCV NFT Backend - Quick Docker Deployment
# Simple script to recreate and start containers

set -e

echo "🐳 JetCV NFT Backend - Quick Docker Deployment"
echo "=============================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file"
        echo "⚠️  Please update .env with your configuration"
    else
        echo "❌ .env.example not found. Please create .env manually"
        exit 1
    fi
fi

echo "🔄 Stopping existing containers..."
docker compose down --remove-orphans

echo "🏗️  Building containers (no cache)..."
docker compose build --no-cache

echo "🚀 Starting containers..."
docker compose up -d

echo "⏳ Waiting for containers to start..."
sleep 10

echo "📊 Container status:"
docker compose ps

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🌐 Access points:"
echo "   API Docs: http://localhost:4000/docs"
echo "   Web UI:   http://localhost:4000"
echo ""
echo "📝 Useful commands:"
echo "   docker compose logs -f    # Follow logs"
echo "   docker compose down       # Stop containers"
echo "   docker compose restart    # Restart containers"
