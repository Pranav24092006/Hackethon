/**
 * Unit tests for Authentication Service
 */

import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  register,
  login,
  verifyToken,
  hashPassword,
  comparePassword
} from '../authService';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockSend = jest.fn();

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DynamoDBDocumentClient.from as jest.Mock) = jest.fn().mockReturnValue({
      send: mockSend
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);
      
      const result = await comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const username = 'testuser';
      const password = 'testPassword123';
      const role = 'ambulance' as const;

      // Mock username uniqueness check (no existing user)
      mockSend.mockResolvedValueOnce({ Items: [] });
      // Mock user creation
      mockSend.mockResolvedValueOnce({});

      const user = await register(username, password, role);

      expect(user.id).toBeDefined();
      expect(user.username).toBe(username);
      expect(user.role).toBe(role);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect((user as any).passwordHash).toBeUndefined();

      // Verify DynamoDB calls
      expect(mockSend).toHaveBeenCalledTimes(2);
      const queryCommand = mockSend.mock.calls[0][0];
      expect(queryCommand).toBeInstanceOf(QueryCommand);
      const putCommand = mockSend.mock.calls[1][0];
      expect(putCommand).toBeInstanceOf(PutCommand);
    });

    it('should throw error for duplicate username', async () => {
      const username = 'duplicate';
      const password = 'testPassword123';
      const role = 'police' as const;

      // Mock username already exists
      mockSend.mockResolvedValueOnce({
        Items: [{ id: '123', username: 'duplicate' }]
      });

      await expect(register(username, password, role)).rejects.toThrow('Username already exists');
    });

    it('should store password as bcrypt hash', async () => {
      const username = 'hashtest';
      const password = 'testPassword123';
      const role = 'ambulance' as const;

      mockSend.mockResolvedValueOnce({ Items: [] });
      mockSend.mockResolvedValueOnce({});

      await register(username, password, role);

      const putCommand = mockSend.mock.calls[1][0];
      const storedUser = putCommand.input.Item;
      
      expect(storedUser.passwordHash).toBeDefined();
      expect(storedUser.passwordHash).not.toBe(password);
      expect(storedUser.passwordHash.startsWith('$2b$')).toBe(true);
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      const username = 'logintest';
      const password = 'testPassword123';
      const role = 'ambulance' as const;
      const passwordHash = await bcrypt.hash(password, 10);

      // Mock user query
      mockSend.mockResolvedValueOnce({
        Items: [{
          id: 'user-123',
          username,
          passwordHash,
          role,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }]
      });

      const result = await login(username, password);

      expect(result.token).toBeDefined();
      expect(result.user.username).toBe(username);
      expect(result.user.role).toBe(role);
      expect((result.user as any).passwordHash).toBeUndefined();
      
      // Verify token can be decoded
      const decoded = jwt.decode(result.token) as any;
      expect(decoded.username).toBe(username);
      expect(decoded.role).toBe(role);
    });

    it('should throw error for invalid username', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      await expect(login('nonexistent_user', 'password')).rejects.toThrow('Invalid username or password');
    });

    it('should throw error for invalid password', async () => {
      const username = 'wrongpass';
      const password = 'correctPassword123';
      const passwordHash = await bcrypt.hash(password, 10);

      mockSend.mockResolvedValueOnce({
        Items: [{
          id: 'user-123',
          username,
          passwordHash,
          role: 'police',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }]
      });

      await expect(login(username, 'wrongPassword')).rejects.toThrow('Invalid username or password');
    });

    it('should generate JWT token with 24-hour expiration', async () => {
      const username = 'tokenexpiry';
      const password = 'testPassword123';
      const passwordHash = await bcrypt.hash(password, 10);

      mockSend.mockResolvedValueOnce({
        Items: [{
          id: 'user-123',
          username,
          passwordHash,
          role: 'ambulance',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }]
      });

      const result = await login(username, password);
      const decoded = jwt.decode(result.token) as any;
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      
      // Check expiration is approximately 24 hours (86400 seconds)
      const expirationDuration = decoded.exp - decoded.iat;
      expect(expirationDuration).toBe(86400);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user info', async () => {
      const username = 'tokentest';
      const password = 'testPassword123';
      const role = 'ambulance' as const;
      const passwordHash = await bcrypt.hash(password, 10);

      mockSend.mockResolvedValueOnce({
        Items: [{
          id: 'user-123',
          username,
          passwordHash,
          role,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }]
      });

      const { token } = await login(username, password);
      const verifiedUser = await verifyToken(token);

      expect(verifiedUser.id).toBe('user-123');
      expect(verifiedUser.username).toBe(username);
      expect(verifiedUser.role).toBe(role);
    });

    it('should throw error for invalid token', async () => {
      await expect(verifyToken('invalid.token.here')).rejects.toThrow('Invalid token');
    });

    it('should throw error for malformed token', async () => {
      await expect(verifyToken('not-a-jwt-token')).rejects.toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: '123', username: 'test', role: 'ambulance' },
        process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
        { expiresIn: '-1h' } // Already expired
      );

      await expect(verifyToken(expiredToken)).rejects.toThrow('Token expired');
    });
  });
});
