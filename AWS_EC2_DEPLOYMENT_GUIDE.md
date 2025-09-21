# AWS EC2 Deployment Guide for Rambini Backend

This guide will walk you through deploying the Rambini Backend API to AWS EC2 using GitHub Actions for automated deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS EC2 Setup](#aws-ec2-setup)
3. [Server Configuration](#server-configuration)
4. [GitHub Repository Setup](#github-repository-setup)
5. [Environment Configuration](#environment-configuration)
6. [Deployment Process](#deployment-process)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- AWS Account with EC2 access
- GitHub repository with your Rambini backend code
- Domain name (optional but recommended)
- Basic knowledge of Linux commands
- SSH key pair for EC2 access

## AWS EC2 Setup

### 1. Launch EC2 Instance

1. **Instance Type**: Choose `t3.medium` or larger for production
2. **AMI**: Ubuntu Server 22.04 LTS
3. **Storage**: 20GB+ EBS volume
4. **Security Group**: Configure the following ports:
   - `22` (SSH) - Your IP only
   - `80` (HTTP) - 0.0.0.0/0
   - `443` (HTTPS) - 0.0.0.0/0
   - `3500-3502` (Application ports) - 0.0.0.0/0

### 2. Connect to Your Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Server Configuration

### 1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 18.x

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install PM2 Process Manager

```bash
sudo npm install -g pm2
```

### 4. Install and Configure PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Configure PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE rambini_db;"
sudo -u postgres psql -c "CREATE USER rambini_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rambini_db TO rambini_user;"
sudo -u postgres psql -c "ALTER USER rambini_user CREATEDB;"
```

### 5. Install and Configure Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Start and enable Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 6. Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Remove default configuration
sudo rm -f /etc/nginx/sites-enabled/default

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 7. Configure Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

### 8. Create Application Directory

```bash
# Create application directory
sudo mkdir -p /home/ubuntu/rambini-backend
sudo chown -R ubuntu:ubuntu /home/ubuntu/rambini-backend

# Create logs directory
mkdir -p /home/ubuntu/rambini-backend/logs

# Create uploads directory
mkdir -p /home/ubuntu/rambini-backend/uploads
```

## GitHub Repository Setup

### 1. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

#### Required Secrets:
- `EC2_HOST`: Your EC2 instance public IP or domain
- `EC2_USERNAME`: `ubuntu`
- `EC2_SSH_KEY`: Your private SSH key content
- `EC2_PORT`: `22` (or your custom SSH port)

#### Environment Variables (as secrets):
- `ENV_PRODUCTION`: Your production environment variables (see format below)
- `ENV_STAGING`: Your staging environment variables
- `ENV_TEST`: Your test environment variables

### 2. Environment Variables Format

The application now automatically loads environment-specific files based on `NODE_ENV`:
- **Production**: `.env.production`
- **Staging**: `.env.staging` 
- **Test**: `.env.test`
- **Development**: `.env` (fallback)

For each environment secret, use this format (all on one line):

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=rambini_user
DB_PASSWORD=your_secure_password
DB_DATABASE=rambini_db
DB_SYNCHRONIZE=false
DB_LOGGING=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=3500
APP_URL=https://api.rambini.com
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=rambini-vendor-documents
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret
PAYSTACK_CALLBACK_URL=https://api.rambini.com/payment/callback
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
SHIPBUBBLE_API_KEY=your_shipbubble_api_key
SHIPBUBBLE_WEBHOOK_SECRET=your_shipbubble_webhook_secret
UBER_CLIENT_ID=your_uber_client_id
UBER_CLIENT_SECRET=your_uber_client_secret
UBER_CUSTOMER_ID=your_uber_customer_id
UBER_WEBHOOK_SECRET=your_uber_webhook_secret
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
```

## Environment Configuration

### 1. Configure Nginx

Copy the nginx configuration from your repository:

```bash
# Copy nginx configuration
sudo cp /home/ubuntu/rambini-backend/nginx/rambini.conf /etc/nginx/sites-available/rambini

# Enable the site
sudo ln -sf /etc/nginx/sites-available/rambini /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 2. Configure PM2 Startup

```bash
# Generate PM2 startup script
pm2 startup

# Follow the instructions provided by the command above
# It will look something like:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

## Deployment Process

### 1. Automatic Deployment

The deployment is fully automated through GitHub Actions. Simply push to the appropriate branch:

- **Production**: Push to `main` branch
- **Staging**: Push to `dev` branch  
- **Test**: Push to `staging` branch

### 2. Manual Deployment (if needed)

If you need to deploy manually:

```bash
# Navigate to application directory
cd /home/ubuntu/rambini-backend

# Pull latest changes
git pull origin main

# Install dependencies
npm ci --production

# Run database migrations
npm run migration:run

# Restart application
pm2 restart rambini-production --update-env
```

### 3. Database Migrations

The deployment process automatically runs database migrations. If you need to run them manually:

```bash
cd /home/ubuntu/rambini-backend

# For production
NODE_ENV=production npm run migration:run

# For staging
NODE_ENV=staging npm run migration:run

# For test
NODE_ENV=test npm run migration:run
```

## Monitoring and Maintenance

### 1. Check Application Status

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs rambini-production
pm2 logs rambini-staging
pm2 logs rambini-test

# Monitor in real-time
pm2 monit
```

### 2. Check System Resources

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
htop
```

### 3. Check Service Status

```bash
# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql

# Check Redis
sudo systemctl status redis-server
```

### 4. View Application Logs

```bash
# Application logs
tail -f /home/ubuntu/rambini-backend/logs/production-combined.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

### 5. Restart Services

```bash
# Restart specific application
pm2 restart rambini-production

# Restart all applications
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql

# Restart Redis
sudo systemctl restart redis-server
```

## Environment Variable Loading

The application now includes automatic environment variable loading based on `NODE_ENV`. This fixes the issue where environment variables weren't being loaded properly.

### How it works:
1. **Automatic Detection**: The app detects `NODE_ENV` and loads the corresponding `.env.{NODE_ENV}` file
2. **Fallback Support**: If the environment-specific file doesn't exist, it falls back to `.env`
3. **Validation**: Required environment variables are validated on startup
4. **Logging**: Environment loading is logged for debugging

### Testing Environment Loading

You can test if your environment variables are loading correctly:

```bash
# Test with production environment
NODE_ENV=production node test-env-loading.js

# Test with staging environment  
NODE_ENV=staging node test-env-loading.js

# Test with test environment
NODE_ENV=test node test-env-loading.js
```

### Required Environment Variables

The following variables are required and will cause the application to fail if missing:
- `DB_HOST`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `JWT_SECRET`
- `SHIPBUBBLE_API_KEY`

## Troubleshooting

### 1. Application Won't Start

```bash
# Check PM2 logs
pm2 logs rambini-production --lines 50

# Check if port is in use
sudo netstat -tlnp | grep :3500

# Check environment variables
pm2 show rambini-production
```

### 2. Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U rambini_user -d rambini_db

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 3. Nginx Issues

```bash
# Test nginx configuration
sudo nginx -t

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if nginx is running
sudo systemctl status nginx
```

### 4. Memory Issues

```bash
# Check memory usage
free -h

# Check swap usage
swapon --show

# Restart application to free memory
pm2 restart rambini-production
```

### 5. Disk Space Issues

```bash
# Check disk usage
df -h

# Clean up old logs
pm2 flush

# Clean up old backups
rm -rf /home/ubuntu/rambini-backups/rambini-*
```

## Security Considerations

### 1. Firewall Configuration

Ensure only necessary ports are open:

```bash
# Check firewall status
sudo ufw status

# Allow only necessary ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 2. SSH Security

```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no

# Restart SSH
sudo systemctl restart ssh
```

### 3. Database Security

```bash
# Change default PostgreSQL password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_secure_password';"

# Configure PostgreSQL to only accept local connections
sudo nano /etc/postgresql/*/main/postgresql.conf
# Set: listen_addresses = 'localhost'
```

### 4. SSL/TLS Setup (Recommended)

For production, set up SSL certificates using Let's Encrypt:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.rambini.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Backup Strategy

### 1. Database Backup

```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/rambini-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -h localhost -U rambini_user -d rambini_db > $BACKUP_DIR/rambini_db_$DATE.sql
find $BACKUP_DIR -name "rambini_db_*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-db.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

### 2. Application Backup

```bash
# Create application backup script
cat > /home/ubuntu/backup-app.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/rambini-backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/rambini-app_$DATE.tar.gz -C /home/ubuntu rambini-backend
find $BACKUP_DIR -name "rambini-app_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-app.sh
```

## Performance Optimization

### 1. PM2 Cluster Mode

The production configuration uses cluster mode for better performance. Monitor CPU usage:

```bash
# Check cluster performance
pm2 monit

# Scale up/down instances
pm2 scale rambini-production 4
```

### 2. Nginx Optimization

```bash
# Edit nginx configuration for better performance
sudo nano /etc/nginx/nginx.conf

# Add these settings in the http block:
# worker_processes auto;
# worker_connections 1024;
# keepalive_timeout 65;
# gzip on;
# gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 3. Database Optimization

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Recommended settings:
# shared_buffers = 256MB
# effective_cache_size = 1GB
# maintenance_work_mem = 64MB
# checkpoint_completion_target = 0.9
# wal_buffers = 16MB
# default_statistics_target = 100
```

## Monitoring Setup

### 1. Install Monitoring Tools

```bash
# Install htop for process monitoring
sudo apt install -y htop

# Install iotop for disk I/O monitoring
sudo apt install -y iotop

# Install nethogs for network monitoring
sudo apt install -y nethogs
```

### 2. Set Up Log Rotation

```bash
# Configure logrotate for application logs
sudo nano /etc/logrotate.d/rambini

# Add:
# /home/ubuntu/rambini-backend/logs/*.log {
#     daily
#     missingok
#     rotate 7
#     compress
#     delaycompress
#     notifempty
#     create 644 ubuntu ubuntu
#     postrotate
#         pm2 reloadLogs
#     endscript
# }
```

## Conclusion

This deployment guide provides a comprehensive setup for deploying the Rambini Backend to AWS EC2. The automated deployment through GitHub Actions ensures consistent and reliable deployments across different environments.

For additional support or questions, refer to:
- [NestJS Documentation](https://docs.nestjs.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
