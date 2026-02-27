/**
 * DynamoDB Hospitals Table Creation Script
 * 
 * Creates the Hospitals table with the following schema:
 * - Primary Key: id (HASH)
 * 
 * This script is designed to work within AWS Free Tier limits.
 */

import { 
  DynamoDBClient, 
  CreateTableCommand,
  CreateTableCommandInput 
} from '@aws-sdk/client-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

const tableParams: CreateTableCommandInput = {
  TableName: 'Hospitals',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

/**
 * Creates the Hospitals table in DynamoDB
 */
export async function createHospitalsTable(): Promise<void> {
  try {
    const command = new CreateTableCommand(tableParams);
    const response = await client.send(command);
    
    console.log('Hospitals table created successfully:', response.TableDescription?.TableName);
    console.log('Table ARN:', response.TableDescription?.TableArn);
    console.log('Table status:', response.TableDescription?.TableStatus);
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log('Hospitals table already exists');
    } else {
      console.error('Error creating Hospitals table:', error);
      throw error;
    }
  }
}

// Run the script if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  createHospitalsTable()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
