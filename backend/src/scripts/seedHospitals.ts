/**
 * Hospital Data Seeding Script
 * 
 * Seeds the DynamoDB Hospitals table with sample hospital data.
 * Uses the sample hospitals from the simulation engine.
 * 
 * Usage: node dist/scripts/seedHospitals.js
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getSampleHospitals } from '../services/simulationEngine.js';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT })
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.HOSPITALS_TABLE || 'Hospitals';

/**
 * Seed hospitals table with sample data
 */
async function seedHospitals(): Promise<void> {
  try {
    console.log('Starting hospital data seeding...');
    console.log(`Target table: ${TABLE_NAME}`);

    // Get sample hospitals from simulation engine
    const hospitals = getSampleHospitals();

    console.log(`Seeding ${hospitals.length} hospitals...`);

    // Batch write hospitals (DynamoDB allows max 25 items per batch)
    const batchSize = 25;
    for (let i = 0; i < hospitals.length; i += batchSize) {
      const batch = hospitals.slice(i, i + batchSize);

      const putRequests = batch.map(hospital => ({
        PutRequest: {
          Item: {
            id: hospital.id,
            name: hospital.name,
            location: hospital.location,
            address: hospital.address,
            capacity: hospital.capacity,
            emergencyCapable: hospital.emergencyCapable,
            phoneNumber: hospital.phoneNumber,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: putRequests
        }
      });

      await docClient.send(command);
      console.log(`Seeded batch ${Math.floor(i / batchSize) + 1} (${batch.length} hospitals)`);
    }

    console.log('Hospital data seeding completed successfully!');
    console.log(`Total hospitals seeded: ${hospitals.length}`);
  } catch (error) {
    console.error('Error seeding hospital data:', error);
    throw error;
  }
}

/**
 * Seed a single hospital (for testing or individual additions)
 */
export async function seedSingleHospital(hospital: any): Promise<void> {
  try {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        id: hospital.id,
        name: hospital.name,
        location: hospital.location,
        address: hospital.address,
        capacity: hospital.capacity,
        emergencyCapable: hospital.emergencyCapable,
        phoneNumber: hospital.phoneNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

    await docClient.send(command);
    console.log(`Hospital ${hospital.name} seeded successfully`);
  } catch (error) {
    console.error(`Error seeding hospital ${hospital.name}:`, error);
    throw error;
  }
}

// Run seeding if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedHospitals()
    .then(() => {
      console.log('Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding script failed:', error);
      process.exit(1);
    });
}

export { seedHospitals };
