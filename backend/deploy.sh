#!/bin/bash

# Smart Emergency Route Optimizer - EC2 Deployment Script
# 
# This script deploys the application to an AWS EC2 instance.
# Requirements: 12.1, 12.6

set -e  # Exit on error

echo "🚀 Starting deployment to EC2..."

# Configuration
EC2_HOST="${EC2_HOST:-}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_KEY="${EC2_KEY:-~/.ssh/emergency-route-optimizer.pem}"
APP_DIR="/home/$EC2_USER/emergency-route-optimizer"

# Check required environment variables
if [ -z "$EC2_HOST" ]; then
  echo "❌ Error: EC2_HOST environment variable is not set"
  echo "Usage: EC2_HOST=your-ec2-ip.amazonaws.com ./deploy.sh"
  exit 1
fi

echo "📋 Deployment Configuration:"
echo "  Host: $EC2_HOST"
echo "  User: $EC2_USER"
echo "  Key: $EC2_KEY"
echo "  App Directory: $APP_DIR"
echo ""

# Build frontend
echo "🏗️  Building frontend..."
cd ../frontend
npm run build
cd ../backend

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='*.log' \
  --exclude='.git' \
  --exclude='deploy.tar.gz' \
  -C .. \
  backend/src \
  backend/package.json \
  backend/package-lock.json \
  backend/tsconfig.json \
  backend/.env.example \
  frontend/dist

echo "✅ Deployment package created"

# Upload to EC2
echo "📤 Uploading to EC2..."
scp -i "$EC2_KEY" deploy.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"

# Deploy on EC2
echo "🔧 Deploying on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
  set -e
  
  # Create app directory
  mkdir -p ~/emergency-route-optimizer
  cd ~/emergency-route-optimizer
  
  # Extract deployment package
  tar -xzf /tmp/deploy.tar.gz
  rm /tmp/deploy.tar.gz
  
  # Install backend dependencies
  cd backend
  npm install --production
  
  # Build TypeScript
  npm run build
  
  # Setup environment variables (if not exists)
  if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Please create it manually."
    cp .env.example .env
  fi
  
  # Restart application with PM2
  if command -v pm2 &> /dev/null; then
    pm2 delete emergency-route-optimizer || true
    pm2 start dist/index.js --name emergency-route-optimizer
    pm2 save
    echo "✅ Application started with PM2"
  else
    echo "⚠️  PM2 not installed. Please install PM2 and start the application manually."
  fi
  
  echo "✅ Deployment complete!"
ENDSSH

# Cleanup
rm deploy.tar.gz

echo ""
echo "🎉 Deployment successful!"
echo ""
echo "📝 Next steps:"
echo "  1. SSH to EC2: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
echo "  2. Configure .env file with AWS credentials"
echo "  3. Run database provisioning: npm run provision-tables"
echo "  4. Check application logs: pm2 logs emergency-route-optimizer"
echo "  5. Access application: http://$EC2_HOST:3000"
echo ""
