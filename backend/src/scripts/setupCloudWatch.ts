// @ts-nocheck
/**
 * Setup AWS CloudWatch Monitoring
 * 
 * Creates log groups, sets up retention policies, and configures basic metrics.
 * 
 * Requirements: 12.4
 */

import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  PutRetentionPolicyCommand,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  CloudWatchClient,
  PutMetricAlarmCommand,
  DescribeAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';

const logsClient = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const cloudwatchClient = new CloudWatchClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const LOG_GROUP_NAME = '/aws/emergency-route-optimizer';
const RETENTION_DAYS = 7; // Free tier friendly

/**
 * Create CloudWatch log group
 */
async function createLogGroup(): Promise<void> {
  console.log('📋 Creating CloudWatch log group...');

  try {
    // Check if log group exists
    const describeCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: LOG_GROUP_NAME,
    });

    const existing = await logsClient.send(describeCommand);
    const logGroupExists = existing.logGroups?.some(
      (group) => group.logGroupName === LOG_GROUP_NAME
    );

    if (logGroupExists) {
      console.log('✅ Log group already exists');
      return;
    }

    // Create log group
    const createCommand = new CreateLogGroupCommand({
      logGroupName: LOG_GROUP_NAME,
    });

    await logsClient.send(createCommand);
    console.log('✅ Log group created successfully');
  } catch (error) {
    console.error('❌ Error creating log group:', error);
    throw error;
  }
}

/**
 * Set log retention policy
 */
async function setRetentionPolicy(): Promise<void> {
  console.log('📅 Setting log retention policy...');

  try {
    const command = new PutRetentionPolicyCommand({
      logGroupName: LOG_GROUP_NAME,
      retentionInDays: RETENTION_DAYS,
    });

    await logsClient.send(command);
    console.log(`✅ Retention policy set to ${RETENTION_DAYS} days`);
  } catch (error) {
    console.error('❌ Error setting retention policy:', error);
    throw error;
  }
}

/**
 * Create CloudWatch alarms
 */
async function createAlarms(): Promise<void> {
  console.log('🚨 Creating CloudWatch alarms...');

  try {
    // Check if alarm exists
    const describeCommand = new DescribeAlarmsCommand({
      AlarmNames: ['emergency-route-optimizer-errors'],
    });

    const existing = await cloudwatchClient.send(describeCommand);
    if (existing.MetricAlarms && existing.MetricAlarms.length > 0) {
      console.log('✅ Alarms already exist');
      return;
    }

    // Create error rate alarm
    const createCommand = new PutMetricAlarmCommand({
      AlarmName: 'emergency-route-optimizer-errors',
      AlarmDescription: 'Alert when error rate is high',
      MetricName: 'Errors',
      Namespace: 'EmergencyRouteOptimizer',
      Statistic: 'Sum',
      Period: 300, // 5 minutes
      EvaluationPeriods: 1,
      Threshold: 10,
      ComparisonOperator: 'GreaterThanThreshold',
      TreatMissingData: 'notBreaching',
    });

    await cloudwatchClient.send(createCommand);
    console.log('✅ Error rate alarm created');
  } catch (error) {
    console.error('❌ Error creating alarms:', error);
    throw error;
  }
}

/**
 * Verify CloudWatch configuration
 */
async function verifyConfiguration(): Promise<void> {
  console.log('🔍 Verifying CloudWatch configuration...\n');

  // Check environment variables
  const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((varName) => console.error(`  - ${varName}`));
    throw new Error('Missing required environment variables');
  }

  console.log('✅ Environment variables configured');
  console.log('  Region:', process.env.AWS_REGION);
}

/**
 * Main setup function
 */
async function setupCloudWatch(): Promise<void> {
  console.log('🚀 Starting CloudWatch setup...\n');

  try {
    // Verify configuration
    await verifyConfiguration();

    // Create log group
    await createLogGroup();

    // Set retention policy
    await setRetentionPolicy();

    // Create alarms
    await createAlarms();

    console.log('\n🎉 CloudWatch setup complete!');
    console.log('\n📊 Configuration:');
    console.log(`  Log Group: ${LOG_GROUP_NAME}`);
    console.log(`  Retention: ${RETENTION_DAYS} days`);
    console.log('  Alarms: Error rate monitoring');
    console.log('\n💡 Next steps:');
    console.log('  1. View logs in AWS Console > CloudWatch > Logs');
    console.log('  2. Set up additional alarms as needed');
    console.log('  3. Configure SNS notifications for alarms');
    console.log('  4. Monitor costs in CloudWatch billing');
  } catch (error) {
    console.error('\n💥 CloudWatch setup failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  setupCloudWatch()
    .then(() => {
      console.log('\n✨ Setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

export { setupCloudWatch };
