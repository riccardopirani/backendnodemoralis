#!/bin/bash

# JetCV NFT Backend - Docker Deployment Script
# This script recreates and starts all containers with the latest code

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if docker compose is available
check_docker_compose() {
    if ! command -v docker compose &> /dev/null; then
        print_error "docker compose is not installed. Please install it and try again."
        exit 1
    fi
    print_success "docker compose is available"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
            print_warning "Please update .env file with your configuration before continuing"
            read -p "Press Enter to continue or Ctrl+C to abort..."
        else
            print_error ".env.example file not found. Please create a .env file manually."
            exit 1
        fi
    else
        print_success ".env file found"
    fi
}

# Function to stop and remove existing containers
cleanup_containers() {
    print_status "Stopping and removing existing containers..."
    docker compose down --remove-orphans
    print_success "Existing containers stopped and removed"
}

# Function to remove old images (optional)
cleanup_images() {
    if [ "$1" = "--clean-images" ]; then
        print_status "Removing old images..."
        docker compose down --rmi all --volumes --remove-orphans
        print_success "Old images removed"
    fi
}

# Function to build and start containers
deploy_containers() {
    print_status "Building and starting containers..."
    
    # Build with no cache to ensure fresh build
    docker compose build --no-cache
    
    # Start containers in detached mode
    docker compose up -d
    
    print_success "Containers built and started"
}

# Function to check container health
check_health() {
    print_status "Checking container health..."
    
    # Wait a bit for containers to start
    sleep 10
    
    # Check if containers are running
    if docker compose ps | grep -q "Up"; then
        print_success "All containers are running"
        
        # Show container status
        print_status "Container status:"
        docker compose ps
        
        # Show logs for the main service
        print_status "Recent logs from backend service:"
        docker compose logs --tail=20 backend || docker compose logs --tail=20 app
    else
        print_error "Some containers failed to start"
        docker compose ps
        docker compose logs
        exit 1
    fi
}

# Function to show useful information
show_info() {
    print_status "Deployment completed successfully!"
    echo ""
    echo -e "${GREEN}Useful commands:${NC}"
    echo "  docker compose ps          - Show container status"
    echo "  docker compose logs -f     - Follow logs"
    echo "  docker compose down        - Stop containers"
    echo "  docker compose restart     - Restart containers"
    echo ""
    echo -e "${GREEN}Access points:${NC}"
    echo "  API Documentation: http://localhost:4500/docs"
echo "  Web Interface: http://localhost:4500"
echo "  API JSON: http://localhost:4500/api-docs.json"
    echo ""
    echo -e "${GREEN}Database:${NC}"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: jetcv_db"
    echo ""
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 15
    
    # Run migrations
    docker compose exec -T backend npm run db:migrate || \
    docker compose exec -T app npm run db:migrate || \
    print_warning "Could not run migrations automatically. Please run manually:"
    print_warning "  docker compose exec backend npm run db:migrate"
}

# Main deployment function
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  JetCV NFT Backend Deployment${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    
    # Check prerequisites
    check_docker
    check_docker_compose
    check_env_file
    
    # Cleanup
    cleanup_containers
    cleanup_images "$1"
    
    # Deploy
    deploy_containers
    
    # Health check
    check_health
    
    # Run migrations
    run_migrations
    
    # Show information
    show_info
    
    print_success "Deployment completed successfully!"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --clean-images    Remove old images before building"
        echo "  --help, -h        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                # Normal deployment"
        echo "  $0 --clean-images # Clean deployment with image removal"
        exit 0
        ;;
    --clean-images)
        main "$1"
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
