// @ts-nocheck
/**
 * Delete All DynamoDB Tables Script
 * 
 * Deletes all DynamoDB tables for cleanup or reset.
 * Use with caution - this will delete all data!
 * 
 * Requirements: 9.6, 12.2
 */

import { DynamoDBClient, DeleteTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

const TABLE_NAMES = ['Users', 'Alerts', 'Ambulances', 'Hospitals'];

/**
 * Delete a single table
 */
async function deleteTable(tableName: string): Promise<void> {
  try {
    const command = new DeleteTableCommand({
      TableName: tableName,
    });

    await client.send(command);
    console.log(`✅ Deleted table: ${tableName}`);
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`⚠️  Table ${tableName} does not exist`);
    } else {
      console.error(`❌ Error deleting table ${tableName}:`, error);
      throw error;
    }
  }
}

/**
 * Delete all tables
 */
async function deleteAllTables(): Promise<void> {
  console.log('🗑️  Starting table deletion...\n');

  for (const tableName of TABLE_NAMES) {
    await deleteTable(tableName);
  }

  console.log('\n✨ All tables deleted successfully!');
}

// Run if executed directly
if (require.main === module) {
  // Require confirmation
  const args = process.argv.slice(2);
  if (!args.includes('--confirm')) {
    console.error('⚠️  WARNING: This will delete all tables and data!');
    console.error('To proceed, run: npm run delete-tables -- --confirm');
    process.exit(1);
  }

  deleteAllTables()
    .then(() => {
      console.log('\n✨ Deletion complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Deletion failed:', error);
      process.exit(1);
    });
}

export { deleteAllTables };
