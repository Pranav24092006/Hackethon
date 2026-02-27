/**
 * Database Service
 * 
 * Provides CRUD operations for all DynamoDB tables in the Smart Emergency Route Optimizer system.
 * Handles Users, Alerts, Ambulances, and Hospitals tables with proper error handling.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { User } from '../models/User.js';
import { Alert, AlertStatus } from '../models/Alert.js';
import { Ambulance, AmbulanceStatus } from '../models/Ambulance.js';
import { Hospital } from '../models/Hospital.js';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT })
});

const docClient = DynamoDBDocumentClient.from(client);

// Error types
export class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ItemNotFoundError extends DatabaseError {
  constructor(tableName: string, id: string) {
    super(`Item not found in ${tableName} with id: ${id}`, 'ITEM_NOT_FOUND');
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class ConnectionTimeoutError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONNECTION_TIMEOUT');
  }
}

/**
 * Retry a database operation with exponential backoff
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry validation errors or item not found errors
      if (error instanceof ValidationError || error instanceof ItemNotFoundError) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new ConnectionTimeoutError(`Operation failed after ${maxRetries} attempts: ${lastError!.message}`);
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Create a new user in the database
 */
export async function createUser(user: User): Promise<User> {
  if (!user.id || !user.username || !user.passwordHash || !user.role) {
    throw new ValidationError('Missing required user fields: id, username, passwordHash, role');
  }

  return retryOperation(async () => {
    const command = new PutCommand({
      TableName: 'Users',
      Item: user
    });
    
    await docClient.send(command);
    return user;
  });
}

/**
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<User> {
  if (!id) {
    throw new ValidationError('User ID is required');
  }

  return retryOperation(async () => {
    const command = new GetCommand({
      TableName: 'Users',
      Key: { id }
    });
    
    const result = await docClient.send(command);
    
    if (!result.Item) {
      throw new ItemNotFoundError('Users', id);
    }
    
    return result.Item as User;
  });
}

/**
 * Get a user by username using the username index
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  if (!username) {
    throw new ValidationError('Username is required');
  }

  return retryOperation(async () => {
    const command = new QueryCommand({
      TableName: 'Users',
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username
      }
    });
    
    const result = await docClient.send(command);
    
    if (!result.Items || result.Items.length === 0) {
      return null;
    }
    
    return result.Items[0] as User;
  });
}

/**
 * Update a user
 */
export async function updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User> {
  if (!id) {
    throw new ValidationError('User ID is required');
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No update fields provided');
  }

  return retryOperation(async () => {
    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    });
    
    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    const command = new UpdateCommand({
      TableName: 'Users',
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    
    const result = await docClient.send(command);
    
    if (!result.Attributes) {
      throw new ItemNotFoundError('Users', id);
    }
    
    return result.Attributes as User;
  });
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
  if (!id) {
    throw new ValidationError('User ID is required');
  }

  return retryOperation(async () => {
    const command = new DeleteCommand({
      TableName: 'Users',
      Key: { id }
    });
    
    await docClient.send(command);
  });
}

// ============================================================================
// ALERT OPERATIONS
// ============================================================================

/**
 * Create a new alert in the database
 */
export async function createAlert(alert: Alert): Promise<Alert> {
  if (!alert.id || !alert.ambulanceId || !alert.message || !alert.status) {
    throw new ValidationError('Missing required alert fields: id, ambulanceId, message, status');
  }

  if (!alert.ambulanceLocation || !alert.destination || !alert.congestionPoint) {
    throw new ValidationError('Missing required location fields: ambulanceLocation, destination, congestionPoint');
  }

  return retryOperation(async () => {
    const command = new PutCommand({
      TableName: 'Alerts',
      Item: alert
    });
    
    await docClient.send(command);
    return alert;
  });
}

/**
 * Get an alert by ID
 */
export async function getAlertById(id: string): Promise<Alert> {
  if (!id) {
    throw new ValidationError('Alert ID is required');
  }

  return retryOperation(async () => {
    const command = new GetCommand({
      TableName: 'Alerts',
      Key: { id }
    });
    
    const result = await docClient.send(command);
    
    if (!result.Item) {
      throw new ItemNotFoundError('Alerts', id);
    }
    
    return result.Item as Alert;
  });
}

/**
 * Get all alerts for a specific ambulance
 */
export async function getAlertsByAmbulanceId(ambulanceId: string): Promise<Alert[]> {
  if (!ambulanceId) {
    throw new ValidationError('Ambulance ID is required');
  }

  return retryOperation(async () => {
    const command = new QueryCommand({
      TableName: 'Alerts',
      IndexName: 'ambulanceId-createdAt-index',
      KeyConditionExpression: 'ambulanceId = :ambulanceId',
      ExpressionAttributeValues: {
        ':ambulanceId': ambulanceId
      },
      ScanIndexForward: false // Sort by createdAt descending (newest first)
    });
    
    const result = await docClient.send(command);
    return (result.Items || []) as Alert[];
  });
}

/**
 * Get all active alerts (pending or dispatched)
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  return retryOperation(async () => {
    const command = new ScanCommand({
      TableName: 'Alerts',
      FilterExpression: '#status IN (:pending, :dispatched)',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':pending': 'pending',
        ':dispatched': 'dispatched'
      }
    });
    
    const result = await docClient.send(command);
    return (result.Items || []) as Alert[];
  });
}

/**
 * Update an alert's status
 */
export async function updateAlertStatus(id: string, status: AlertStatus): Promise<Alert> {
  if (!id) {
    throw new ValidationError('Alert ID is required');
  }

  if (!['pending', 'dispatched', 'cleared', 'cancelled'].includes(status)) {
    throw new ValidationError(`Invalid alert status: ${status}`);
  }

  return retryOperation(async () => {
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Add clearedAt timestamp if status is cleared
    if (status === 'cleared') {
      updates.clearedAt = new Date().toISOString();
    }
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    });
    
    const command = new UpdateCommand({
      TableName: 'Alerts',
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    
    const result = await docClient.send(command);
    
    if (!result.Attributes) {
      throw new ItemNotFoundError('Alerts', id);
    }
    
    return result.Attributes as Alert;
  });
}

/**
 * Update an alert
 */
export async function updateAlert(id: string, updates: Partial<Omit<Alert, 'id'>>): Promise<Alert> {
  if (!id) {
    throw new ValidationError('Alert ID is required');
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No update fields provided');
  }

  return retryOperation(async () => {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    });
    
    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    const command = new UpdateCommand({
      TableName: 'Alerts',
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    
    const result = await docClient.send(command);
    
    if (!result.Attributes) {
      throw new ItemNotFoundError('Alerts', id);
    }
    
    return result.Attributes as Alert;
  });
}

/**
 * Delete an alert
 */
export async function deleteAlert(id: string): Promise<void> {
  if (!id) {
    throw new ValidationError('Alert ID is required');
  }

  return retryOperation(async () => {
    const command = new DeleteCommand({
      TableName: 'Alerts',
      Key: { id }
    });
    
    await docClient.send(command);
  });
}

// ============================================================================
// AMBULANCE OPERATIONS
// ============================================================================

/**
 * Create a new ambulance in the database
 */
export async function createAmbulance(ambulance: Ambulance): Promise<Ambulance> {
  if (!ambulance.id || !ambulance.vehicleNumber || !ambulance.status) {
    throw new ValidationError('Missing required ambulance fields: id, vehicleNumber, status');
  }

  if (!ambulance.currentLocation) {
    throw new ValidationError('Missing required field: currentLocation');
  }

  return retryOperation(async () => {
    const command = new PutCommand({
      TableName: 'Ambulances',
      Item: ambulance
    });
    
    await docClient.send(command);
    return ambulance;
  });
}

/**
 * Get an ambulance by ID
 */
export async function getAmbulanceById(id: string): Promise<Ambulance> {
  if (!id) {
    throw new ValidationError('Ambulance ID is required');
  }

  return retryOperation(async () => {
    const command = new GetCommand({
      TableName: 'Ambulances',
      Key: { id }
    });
    
    const result = await docClient.send(command);
    
    if (!result.Item) {
      throw new ItemNotFoundError('Ambulances', id);
    }
    
    return result.Item as Ambulance;
  });
}

/**
 * Get all ambulances
 */
export async function getAllAmbulances(): Promise<Ambulance[]> {
  return retryOperation(async () => {
    const command = new ScanCommand({
      TableName: 'Ambulances'
    });
    
    const result = await docClient.send(command);
    return (result.Items || []) as Ambulance[];
  });
}

/**
 * Update an ambulance
 */
export async function updateAmbulance(id: string, updates: Partial<Omit<Ambulance, 'id'>>): Promise<Ambulance> {
  if (!id) {
    throw new ValidationError('Ambulance ID is required');
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No update fields provided');
  }

  return retryOperation(async () => {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    });
    
    // Always update the lastUpdated timestamp
    updateExpressions.push('#lastUpdated = :lastUpdated');
    expressionAttributeNames['#lastUpdated'] = 'lastUpdated';
    expressionAttributeValues[':lastUpdated'] = new Date().toISOString();
    
    const command = new UpdateCommand({
      TableName: 'Ambulances',
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    
    const result = await docClient.send(command);
    
    if (!result.Attributes) {
      throw new ItemNotFoundError('Ambulances', id);
    }
    
    return result.Attributes as Ambulance;
  });
}

/**
 * Delete an ambulance
 */
export async function deleteAmbulance(id: string): Promise<void> {
  if (!id) {
    throw new ValidationError('Ambulance ID is required');
  }

  return retryOperation(async () => {
    const command = new DeleteCommand({
      TableName: 'Ambulances',
      Key: { id }
    });
    
    await docClient.send(command);
  });
}

// ============================================================================
// HOSPITAL OPERATIONS
// ============================================================================

/**
 * Create a new hospital in the database
 */
export async function createHospital(hospital: Hospital): Promise<Hospital> {
  if (!hospital.id || !hospital.name || !hospital.address || !hospital.phoneNumber) {
    throw new ValidationError('Missing required hospital fields: id, name, address, phoneNumber');
  }

  if (!hospital.location) {
    throw new ValidationError('Missing required field: location');
  }

  if (typeof hospital.capacity !== 'number' || hospital.capacity < 0) {
    throw new ValidationError('Capacity must be a non-negative number');
  }

  if (typeof hospital.emergencyCapable !== 'boolean') {
    throw new ValidationError('emergencyCapable must be a boolean');
  }

  return retryOperation(async () => {
    const command = new PutCommand({
      TableName: 'Hospitals',
      Item: hospital
    });
    
    await docClient.send(command);
    return hospital;
  });
}

/**
 * Get a hospital by ID
 */
export async function getHospitalById(id: string): Promise<Hospital> {
  if (!id) {
    throw new ValidationError('Hospital ID is required');
  }

  return retryOperation(async () => {
    const command = new GetCommand({
      TableName: 'Hospitals',
      Key: { id }
    });
    
    const result = await docClient.send(command);
    
    if (!result.Item) {
      throw new ItemNotFoundError('Hospitals', id);
    }
    
    return result.Item as Hospital;
  });
}

/**
 * Get all hospitals
 */
export async function getAllHospitals(): Promise<Hospital[]> {
  return retryOperation(async () => {
    const command = new ScanCommand({
      TableName: 'Hospitals'
    });
    
    const result = await docClient.send(command);
    return (result.Items || []) as Hospital[];
  });
}

/**
 * Update a hospital
 */
export async function updateHospital(id: string, updates: Partial<Omit<Hospital, 'id'>>): Promise<Hospital> {
  if (!id) {
    throw new ValidationError('Hospital ID is required');
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No update fields provided');
  }

  return retryOperation(async () => {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    });
    
    const command = new UpdateCommand({
      TableName: 'Hospitals',
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    
    const result = await docClient.send(command);
    
    if (!result.Attributes) {
      throw new ItemNotFoundError('Hospitals', id);
    }
    
    return result.Attributes as Hospital;
  });
}

/**
 * Delete a hospital
 */
export async function deleteHospital(id: string): Promise<void> {
  if (!id) {
    throw new ValidationError('Hospital ID is required');
  }

  return retryOperation(async () => {
    const command = new DeleteCommand({
      TableName: 'Hospitals',
      Key: { id }
    });
    
    await docClient.send(command);
  });
}
