// @ts-nocheck
/**
 * Provision All DynamoDB Tables Script
 * 
 * Creates all required DynamoDB tables for the Smart Emergency Route Optimizer.
 * Configured to stay within AWS Free Tier limits.
 * 
 * Requirements: 9.6, 12.2, 12.5
 */

import { createUsersTable } from './createUsersTable';
import { createAlertsTable } from './createAlertsTable';
import { createAmbulancesTable } from './createAmbulancesTable';
import { createHospitalsTable } from './createHospitalsTable';
import { seedHospitals } from './seedHospitals';

/**
 * Provision all tables in sequence
 */
async function provisionAllTables(): Promise<void> {
  console.log('🚀 Starting DynamoDB table provisioning...\n');

  try {
    // Create Users table
    console.log('📋 Creating Users table...');
    await createUsersTable();
    console.log('✅ Users table created successfully\n');

    // Create Alerts table
    console.log('📋 Creating Alerts table...');
    await createAlertsTable();
    console.log('✅ Alerts table created successfully\n');

    // Create Ambulances table
    console.log('📋 Creating Ambulances table...');
    await createAmbulancesTable();
    console.log('✅ Ambulances table created successfully\n');

    // Create Hospitals table
    console.log('📋 Creating Hospitals table...');
    await createHospitalsTable();
    console.log('✅ Hospitals table created successfully\n');

    // Seed hospital data
    console.log('📋 Seeding hospital data...');
    await seedHospitals();
    console.log('✅ Hospital data seeded successfully\n');

    console.log('🎉 All tables provisioned successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Users table: Created');
    console.log('  - Alerts table: Created');
    console.log('  - Ambulances table: Created');
    console.log('  - Hospitals table: Created with sample data');
    console.log('\n💡 Tables are configured for AWS Free Tier:');
    console.log('  - Read capacity: 5 units');
    console.log('  - Write capacity: 5 units');
    console.log('  - On-demand billing available for production');
  } catch (error) {
    console.error('❌ Error provisioning tables:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  provisionAllTables()
    .then(() => {
      console.log('\n✨ Provisioning complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Provisioning failed:', error);
      process.exit(1);
    });
}

export { provisionAllTables };
