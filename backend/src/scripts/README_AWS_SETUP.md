# AWS Infrastructure Setup Guide

This guide covers setting up the AWS infrastructure for the Smart Emergency Route Optimizer.

## Prerequisites

- AWS Account with Free Tier access
- AWS CLI installed and configured
- Node.js and npm installed
- Environment variables configured

## AWS Services Used

### 1. DynamoDB (Database)
- **Tables**: Users, Alerts, Ambulances, Hospitals
- **Free Tier**: 25 GB storage, 25 read/write capacity units
- **Configuration**: Provisioned capacity (5 read, 5 write per table)

### 2. SNS (SMS Notifications)
- **Purpose**: Send emergency alert SMS to police
- **Free Tier**: 1,000 SMS messages per month (varies by region)
- **Configuration**: Standard SMS, no topics required

### 3. EC2 (Application Hosting)
- **Instance Type**: t2.micro
- **Free Tier**: 750 hours per month
- **Configuration**: Node.js application with PM2

### 4. CloudWatch (Monitoring)
- **Purpose**: Application logs and basic metrics
- **Free Tier**: 5 GB logs, 10 custom metrics
- **Configuration**: Basic logging only

## Setup Instructions

### Step 1: Configure AWS Credentials

```bash
# Install AWS CLI if not already installed
# Windows: Download from https://aws.amazon.com/cli/
# Mac: brew install awscli
# Linux: sudo apt-get install awscli

# Configure credentials
aws configure

# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

### Step 2: Set Environment Variables

Create `.env` file in the backend directory:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# DynamoDB Configuration
DYNAMODB_ENDPOINT=  # Leave empty for production, set for local testing

# SNS Configuration
SNS_PHONE_NUMBER=+1234567890  # Police phone number for SMS alerts

# Application Configuration
PORT=3000
JWT_SECRET=your_jwt_secret_here
NODE_ENV=production
```

### Step 3: Provision DynamoDB Tables

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run provisioning script
npm run provision-tables

# This will create:
# - Users table with username index
# - Alerts table with ambulanceId-createdAt index
# - Ambulances table
# - Hospitals table with sample data
```

### Step 4: Configure SNS for SMS

```bash
# Verify SNS is enabled in your region
aws sns list-topics --region us-east-1

# Request SMS spending limit increase if needed
# Go to AWS Console > SNS > Text messaging (SMS) > Spending limits

# Test SMS sending (optional)
aws sns publish \
  --phone-number "+1234567890" \
  --message "Test message from Emergency Route Optimizer" \
  --region us-east-1
```

### Step 5: Set Up CloudWatch Logging

CloudWatch logging is automatically configured in the application. No manual setup required.

To view logs:
```bash
# View logs in AWS Console
# CloudWatch > Logs > Log groups > /aws/emergency-route-optimizer

# Or use AWS CLI
aws logs tail /aws/emergency-route-optimizer --follow
```

### Step 6: Deploy to EC2 (Optional)

See `DEPLOYMENT.md` for detailed EC2 deployment instructions.

## Free Tier Limits

### DynamoDB
- **Storage**: 25 GB
- **Read Capacity**: 25 units (5 per table × 4 tables = 20 used)
- **Write Capacity**: 25 units (5 per table × 4 tables = 20 used)
- **Monitoring**: Within limits

### SNS
- **SMS Messages**: 1,000 per month (varies by region)
- **Cost per SMS**: ~$0.00645 after free tier
- **Recommendation**: Limit alerts to critical situations

### EC2
- **Instance Hours**: 750 hours per month (t2.micro)
- **Storage**: 30 GB EBS
- **Data Transfer**: 15 GB out per month

### CloudWatch
- **Logs**: 5 GB ingestion, 5 GB storage
- **Metrics**: 10 custom metrics
- **Alarms**: 10 alarms

## Cost Optimization Tips

1. **DynamoDB**
   - Use on-demand billing for unpredictable workloads
   - Enable auto-scaling for production
   - Set up TTL for old alerts (auto-delete after 7 days)

2. **SNS**
   - Limit SMS to critical alerts only
   - Use email notifications as alternative
   - Monitor SMS usage in CloudWatch

3. **EC2**
   - Use t2.micro for development
   - Consider Lambda for production (pay per request)
   - Stop instances when not in use

4. **CloudWatch**
   - Log only errors and critical events
   - Set up log retention (7 days recommended)
   - Use CloudWatch Insights sparingly

## Monitoring and Alerts

### Set Up Billing Alerts

```bash
# Create billing alarm (requires CloudWatch)
aws cloudwatch put-metric-alarm \
  --alarm-name emergency-route-optimizer-billing \
  --alarm-description "Alert when costs exceed $5" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 5.0 \
  --comparison-operator GreaterThanThreshold
```

### Monitor DynamoDB Usage

```bash
# Check table status
aws dynamodb describe-table --table-name Users

# Check consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=Users \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting

### DynamoDB Connection Issues

```bash
# Test DynamoDB connection
aws dynamodb list-tables --region us-east-1

# Check IAM permissions
aws iam get-user

# Verify credentials
aws sts get-caller-identity
```

### SNS SMS Not Sending

1. Check phone number format (+1234567890)
2. Verify SNS is enabled in your region
3. Check spending limits in SNS console
4. Verify IAM permissions for SNS:Publish

### CloudWatch Logs Not Appearing

1. Check IAM role has CloudWatch permissions
2. Verify log group exists
3. Check application is writing to correct log stream

## Cleanup

To delete all resources:

```bash
# Delete DynamoDB tables
npm run delete-tables -- --confirm

# Delete CloudWatch log groups
aws logs delete-log-group --log-group-name /aws/emergency-route-optimizer

# Terminate EC2 instances (if deployed)
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0
```

## Security Best Practices

1. **Never commit AWS credentials to Git**
2. **Use IAM roles for EC2 instances**
3. **Enable MFA on AWS account**
4. **Rotate access keys regularly**
5. **Use least privilege IAM policies**
6. **Enable CloudTrail for audit logging**
7. **Encrypt sensitive data at rest**
8. **Use VPC for network isolation**

## Support

For AWS-specific issues:
- AWS Documentation: https://docs.aws.amazon.com/
- AWS Support: https://console.aws.amazon.com/support/
- AWS Free Tier FAQ: https://aws.amazon.com/free/

For application issues:
- Check application logs in CloudWatch
- Review error messages in console
- Consult the main README.md
