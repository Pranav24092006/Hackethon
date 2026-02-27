# Deployment Guide - Smart Emergency Route Optimizer

This guide covers deploying the Smart Emergency Route Optimizer to AWS EC2.

## Prerequisites

- AWS Account with EC2 access
- AWS CLI installed and configured
- SSH key pair for EC2 access
- Domain name (optional, for production)

## EC2 Instance Setup

### Step 1: Launch EC2 Instance

```bash
# Launch t2.micro instance (Free Tier eligible)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t2.micro \
  --key-name emergency-route-optimizer \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=emergency-route-optimizer}]'
```

### Step 2: Configure Security Group

Allow the following inbound traffic:
- **SSH (22)**: Your IP address
- **HTTP (80)**: 0.0.0.0/0
- **HTTPS (443)**: 0.0.0.0/0
- **Custom TCP (3000)**: 0.0.0.0/0 (for backend API)

```bash
# Create security group
aws ec2 create-security-group \
  --group-name emergency-route-optimizer-sg \
  --description "Security group for Emergency Route Optimizer"

# Add inbound rules
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0
```

### Step 3: Connect to EC2 Instance

```bash
# Get instance public IP
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=emergency-route-optimizer" \
  --query "Reservations[0].Instances[0].PublicIpAddress"

# Connect via SSH
ssh -i ~/.ssh/emergency-route-optimizer.pem ubuntu@YOUR_EC2_IP
```

### Step 4: Install Dependencies on EC2

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt-get install -y nginx

# Install Git
sudo apt-get install -y git

# Verify installations
node --version
npm --version
pm2 --version
```

### Step 5: Configure Environment Variables

```bash
# Create .env file on EC2
cd ~/emergency-route-optimizer/backend
nano .env
```

Add the following:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# DynamoDB Configuration
DYNAMODB_ENDPOINT=

# SNS Configuration
SNS_PHONE_NUMBER=+1234567890

# Application Configuration
PORT=3000
JWT_SECRET=your_jwt_secret_here
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=http://YOUR_EC2_IP
```

## Deployment

### Option 1: Automated Deployment Script

```bash
# From your local machine
cd backend
EC2_HOST=your-ec2-ip.amazonaws.com ./deploy.sh
```

### Option 2: Manual Deployment

```bash
# 1. Build frontend locally
cd frontend
npm install
npm run build

# 2. Build backend locally
cd ../backend
npm install
npm run build

# 3. Copy files to EC2
scp -i ~/.ssh/emergency-route-optimizer.pem -r dist ubuntu@YOUR_EC2_IP:~/emergency-route-optimizer/backend/
scp -i ~/.ssh/emergency-route-optimizer.pem -r ../frontend/dist ubuntu@YOUR_EC2_IP:~/emergency-route-optimizer/frontend/

# 4. SSH to EC2 and start application
ssh -i ~/.ssh/emergency-route-optimizer.pem ubuntu@YOUR_EC2_IP
cd ~/emergency-route-optimizer/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Post-Deployment Setup

### 1. Provision Database Tables

```bash
# SSH to EC2
ssh -i ~/.ssh/emergency-route-optimizer.pem ubuntu@YOUR_EC2_IP

# Navigate to backend directory
cd ~/emergency-route-optimizer/backend

# Run provisioning script
npm run provision-tables
```

### 2. Configure Nginx Reverse Proxy (Optional)

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/emergency-route-optimizer
```

Add the following:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Frontend
    location / {
        root /home/ubuntu/emergency-route-optimizer/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/emergency-route-optimizer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Set Up SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### 4. Configure PM2 Startup

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

## Monitoring and Maintenance

### View Application Logs

```bash
# PM2 logs
pm2 logs emergency-route-optimizer

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# CloudWatch logs (from AWS Console)
# CloudWatch > Logs > /aws/emergency-route-optimizer
```

### Monitor Application Status

```bash
# PM2 status
pm2 status

# PM2 monitoring dashboard
pm2 monit

# System resources
htop
```

### Restart Application

```bash
# Restart with PM2
pm2 restart emergency-route-optimizer

# Reload without downtime
pm2 reload emergency-route-optimizer

# Stop application
pm2 stop emergency-route-optimizer
```

### Update Application

```bash
# From local machine, run deployment script
EC2_HOST=your-ec2-ip.amazonaws.com ./deploy.sh

# Or manually:
# 1. Build locally
# 2. Upload to EC2
# 3. Restart PM2
pm2 reload emergency-route-optimizer
```

## Backup and Recovery

### Database Backup

```bash
# DynamoDB automatic backups are enabled by default
# To create on-demand backup:
aws dynamodb create-backup \
  --table-name Users \
  --backup-name users-backup-$(date +%Y%m%d)
```

### Application Backup

```bash
# Backup application files
tar -czf backup-$(date +%Y%m%d).tar.gz ~/emergency-route-optimizer

# Download backup to local machine
scp -i ~/.ssh/emergency-route-optimizer.pem \
  ubuntu@YOUR_EC2_IP:~/backup-*.tar.gz \
  ./backups/
```

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs emergency-route-optimizer --lines 100

# Check environment variables
cat ~/emergency-route-optimizer/backend/.env

# Check Node.js version
node --version  # Should be 18.x or higher

# Restart PM2
pm2 restart emergency-route-optimizer
```

### Database Connection Issues

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test DynamoDB connection
aws dynamodb list-tables --region us-east-1

# Check IAM permissions
aws iam get-user
```

### High Memory Usage

```bash
# Check memory usage
free -h

# Restart application
pm2 restart emergency-route-optimizer

# Consider upgrading instance type if needed
```

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## Scaling Considerations

### Horizontal Scaling

- Use AWS Application Load Balancer
- Deploy multiple EC2 instances
- Configure PM2 cluster mode
- Use ElastiCache for session storage

### Vertical Scaling

- Upgrade to larger instance type (t2.small, t2.medium)
- Increase PM2 instances in cluster mode
- Optimize database queries

### Cost Optimization

- Use Reserved Instances for production
- Enable auto-scaling for variable load
- Monitor CloudWatch metrics
- Set up billing alerts

## Security Best Practices

1. **Never commit credentials to Git**
2. **Use IAM roles for EC2 instead of access keys**
3. **Enable AWS CloudTrail for audit logging**
4. **Regularly update system packages**
5. **Use security groups to restrict access**
6. **Enable MFA on AWS account**
7. **Rotate access keys regularly**
8. **Use HTTPS in production**
9. **Implement rate limiting**
10. **Regular security audits**

## Support

For deployment issues:
- Check PM2 logs: `pm2 logs`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check CloudWatch logs in AWS Console
- Review this deployment guide
- Consult AWS documentation

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop current application
pm2 stop emergency-route-optimizer

# 2. Restore from backup
cd ~
tar -xzf backup-YYYYMMDD.tar.gz

# 3. Restart application
cd ~/emergency-route-optimizer/backend
pm2 restart emergency-route-optimizer

# 4. Verify application is working
curl http://localhost:3000/api/health
```

---

**Last Updated**: Current session
**Deployment Target**: AWS EC2 t2.micro (Free Tier)
**Estimated Setup Time**: 30-60 minutes
