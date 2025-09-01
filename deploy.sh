#!/bin/bash

echo "🚀 JetCV NFT Backend - Docker Compose Deployment"
echo "=================================================="

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Build and start containers
echo "🔧 Building and starting containers..."
docker compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Test the API
echo "🧪 Testing API endpoint..."
if curl -f http://localhost:4000/api/contract/info; then
    echo "✅ API is working correctly!"
    echo "📚 Swagger UI: http://localhost:4000/docs"
echo "🌐 API Base: http://localhost:4000"
else
    echo "❌ API test failed!"
    echo "📋 Container logs:"
    docker compose logs api
    exit 1
fi

echo "🎉 Deployment completed successfully!"
