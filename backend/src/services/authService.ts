/**
 * Authentication Service
 * 
 * Handles user registration, login, and JWT token management.
 * Uses bcrypt for password hashing and jsonwebtoken for authentication tokens.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { User, UserRole } from '../models/User.js';

const SALT_ROUNDS = 10;
const JWT_EXPIRATION = '24h';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT })
});

const docClient = DynamoDBDocumentClient.from(client);

export interface LoginResult {
  token: string;
  user: Omit<User, 'passwordHash'>;
}

/**
 * Hash a password using bcrypt with 10 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a username already exists in the database
 */
async function isUsernameUnique(username: string): Promise<boolean> {
  const command = new QueryCommand({
    TableName: 'Users',
    IndexName: 'username-index',
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': username
    }
  });

  const result = await docClient.send(command);
  return !result.Items || result.Items.length === 0;
}

/**
 * Register a new user with username, password, and role
 * 
 * @param username - Unique username for the user
 * @param password - Plain text password (will be hashed)
 * @param role - User role (ambulance or police)
 * @returns The created user (without password hash)
 * @throws Error if username already exists
 */
export async function register(
  username: string,
  password: string,
  role: UserRole
): Promise<Omit<User, 'passwordHash'>> {
  // Check username uniqueness
  const isUnique = await isUsernameUnique(username);
  if (!isUnique) {
    throw new Error('Username already exists');
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Create user object
  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    username,
    passwordHash,
    role,
    createdAt: now,
    updatedAt: now
  };

  // Store in DynamoDB
  const command = new PutCommand({
    TableName: 'Users',
    Item: user
  });

  await docClient.send(command);

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Authenticate a user and generate a JWT token
 * 
 * @param username - Username to authenticate
 * @param password - Plain text password
 * @returns JWT token and user information
 * @throws Error if credentials are invalid
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  // Query user by username
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
    throw new Error('Invalid username or password');
  }

  const user = result.Items[0] as User;

  // Compare password
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid username or password');
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );

  // Return token and user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  return {
    token,
    user: userWithoutPassword
  };
}

/**
 * Verify a JWT token and return the user information
 * 
 * @param token - JWT token to verify
 * @returns User information from the token
 * @throws Error if token is invalid or expired
 */
export async function verifyToken(token: string): Promise<Omit<User, 'passwordHash'>> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      role: UserRole;
    };

    // Return user information from token
    // Note: In a production system, you might want to fetch the full user from the database
    // to ensure the user still exists and hasn't been disabled
    return {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      createdAt: '',
      updatedAt: ''
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}
