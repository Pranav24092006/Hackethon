// @ts-nocheck
/**
 * Configure AWS SNS for SMS Notifications
 * 
 * Sets up SNS for sending emergency alert SMS messages.
 * Verifies configuration and tests SMS delivery.
 * 
 * Requirements: 12.3
 */

import { SNSClient, SetSMSAttributesCommand, GetSMSAttributesCommand, PublishCommand } from '@aws-sdk/client-sns';

const client = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Configure SNS SMS attributes
 */
async function configureSMSAttributes(): Promise<void> {
  console.log('📱 Configuring SNS SMS attributes...');

  try {
    const command = new SetSMSAttributesCommand({
      attributes: {
        // Set default SMS type to Transactional (higher priority, higher cost)
        DefaultSMSType: 'Transactional',
        
        // Set monthly spending limit (in USD)
        MonthlySpendLimit: '10.00',
        
        // Set delivery status logging
        DeliveryStatusIAMRole: process.env.SNS_DELIVERY_STATUS_ROLE || '',
        
        // Set default sender ID (if supported in region)
        DefaultSenderID: 'Emergency',
      },
    });

    await client.send(command);
    console.log('✅ SNS SMS attributes configured successfully');
  } catch (error) {
    console.error('❌ Error configuring SNS attributes:', error);
    throw error;
  }
}

/**
 * Get current SNS SMS attributes
 */
async function getSMSAttributes(): Promise<void> {
  console.log('\n📋 Retrieving current SNS SMS attributes...');

  try {
    const command = new GetSMSAttributesCommand({});
    const response = await client.send(command);

    console.log('\nCurrent SMS Attributes:');
    console.log('  Default SMS Type:', response.attributes?.DefaultSMSType || 'Not set');
    console.log('  Monthly Spend Limit:', response.attributes?.MonthlySpendLimit || 'Not set');
    console.log('  Default Sender ID:', response.attributes?.DefaultSenderID || 'Not set');
  } catch (error) {
    console.error('❌ Error retrieving SNS attributes:', error);
    throw error;
  }
}

/**
 * Test SMS delivery
 */
async function testSMSDelivery(phoneNumber: string): Promise<void> {
  console.log(`\n📤 Testing SMS delivery to ${phoneNumber}...`);

  try {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: 'Test message from Smart Emergency Route Optimizer. SMS notifications are working correctly!',
    });

    const response = await client.send(command);
    console.log('✅ Test SMS sent successfully');
    console.log('  Message ID:', response.MessageId);
  } catch (error) {
    console.error('❌ Error sending test SMS:', error);
    throw error;
  }
}

/**
 * Verify SNS configuration
 */
async function verifySNSConfiguration(): Promise<void> {
  console.log('🔍 Verifying SNS configuration...\n');

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
  console.log('  Access Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...');
}

/**
 * Main configuration function
 */
async function configureSNS(): Promise<void> {
  console.log('🚀 Starting SNS configuration...\n');

  try {
    // Verify configuration
    await verifySNSConfiguration();

    // Configure SMS attributes
    await configureSMSAttributes();

    // Get current attributes
    await getSMSAttributes();

    console.log('\n🎉 SNS configuration complete!');
    console.log('\n💡 Next steps:');
    console.log('  1. Verify your phone number in SNS console (if in sandbox mode)');
    console.log('  2. Request production access if needed');
    console.log('  3. Monitor SMS usage in CloudWatch');
    console.log('  4. Set up billing alerts for SMS costs');
    console.log('\n📝 To test SMS delivery, run:');
    console.log('  npm run test-sms -- +1234567890');
  } catch (error) {
    console.error('\n💥 SNS configuration failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === '--test' && args[1]) {
    // Test SMS delivery
    testSMSDelivery(args[1])
      .then(() => {
        console.log('\n✨ Test complete!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Test failed:', error);
        process.exit(1);
      });
  } else {
    // Configure SNS
    configureSNS()
      .then(() => {
        console.log('\n✨ Configuration complete!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Configuration failed:', error);
        process.exit(1);
      });
  }
}

export { configureSNS, testSMSDelivery, verifySNSConfiguration };
