#!/bin/bash

echo "🚀 JetCV NFT Backend - Production Deployment"
echo "=============================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with production configuration"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Build and start containers in production mode
echo "🔧 Building and starting containers in production mode..."
NODE_ENV=production docker compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 45

# Test the API
echo "🧪 Testing API endpoint..."
if curl -f http://localhost:4500/api/contract/info; then
    echo "✅ Production deployment successful!"
    echo "📚 Swagger UI: http://localhost:4500/docs"
echo "🌐 API Base: http://localhost:4500"
    echo "🔒 Environment: PRODUCTION"
else
    echo "❌ Production deployment failed!"
    echo "📋 Container logs:"
    docker compose logs api
    exit 1
fi

echo "🎉 Production deployment completed successfully!"
