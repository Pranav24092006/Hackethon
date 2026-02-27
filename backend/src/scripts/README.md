# Database Scripts

This directory contains scripts for setting up and managing DynamoDB tables.

## Users Table Creation

The `createUsersTable.ts` script creates the Users table in DynamoDB with the following schema:

### Table Schema

- **Table Name**: Users
- **Primary Key**: `id` (String, HASH)
- **Global Secondary Index**: `username-index`
  - Key: `username` (String, HASH)
  - Projection: ALL

### Attributes

- `id` (String): Unique user identifier (UUID)
- `username` (String): Unique username for login
- `passwordHash` (String): bcrypt hashed password
- `role` (String): User role - either 'ambulance' or 'police'
- `phoneNumber` (String, optional): Phone number for SMS notifications
- `createdAt` (String): ISO 8601 timestamp of user creation
- `updatedAt` (String): ISO 8601 timestamp of last update

### Provisioned Throughput

The table is configured to stay within AWS Free Tier limits:
- Read Capacity Units: 1
- Write Capacity Units: 1

### Usage

#### Prerequisites

Set the following environment variables:
```bash
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
```

#### Run the script

```bash
# Using tsx (development)
npx tsx src/scripts/createUsersTable.ts

# Or compile and run
npm run build
node dist/scripts/createUsersTable.js
```

#### Programmatic Usage

You can also import and use the function in your code:

```typescript
import { createUsersTable } from './scripts/createUsersTable';

await createUsersTable();
```

### Error Handling

- If the table already exists, the script will log a message and exit successfully
- Other errors will be logged and the script will exit with code 1
