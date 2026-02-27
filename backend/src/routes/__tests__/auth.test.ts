/**
 * Authentication API Routes Tests
 * 
 * Tests for the authentication endpoints:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - GET /api/auth/verify
 */

import request from 'supertest';
import { app } from '../../index.js';
import * as authService from '../../services/authService.js';

// Mock the auth service
jest.mock('../../services/authService.js');

const mockedAuthService = authService as jest.Mocked<typeof authService>;

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    const mockUser = {
      id: 'test-id',
      username: 'testuser',
      role: 'ambulance' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    mockedAuthService.register.mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123',
        role: 'ambulance'
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ user: mockUser });
    expect(mockedAuthService.register).toHaveBeenCalledWith('testuser', 'password123', 'ambulance');
  });

  it('should return 400 if required fields are missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser'
        // missing password and role
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return 400 if role is invalid', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123',
        role: 'invalid'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid role');
  });

  it('should return 400 if username is too short', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'ab',
        password: 'password123',
        role: 'ambulance'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid username');
  });

  it('should return 400 if password is too short', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'short',
        role: 'ambulance'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid password');
  });

  it('should return 409 if username already exists', async () => {
    mockedAuthService.register.mockRejectedValue(new Error('Username already exists'));

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'existinguser',
        password: 'password123',
        role: 'ambulance'
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Username already exists');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login successfully with valid credentials', async () => {
    const mockResult = {
      token: 'mock-jwt-token',
      user: {
        id: 'test-id',
        username: 'testuser',
        role: 'ambulance' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    };

    mockedAuthService.login.mockResolvedValue(mockResult);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResult);
    expect(mockedAuthService.login).toHaveBeenCalledWith('testuser', 'password123');
  });

  it('should return 400 if username is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'password123'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return 400 if password is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return 401 if credentials are invalid', async () => {
    mockedAuthService.login.mockRejectedValue(new Error('Invalid username or password'));

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid username or password');
  });
});

describe('GET /api/auth/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify valid token successfully', async () => {
    const mockUser = {
      id: 'test-id',
      username: 'testuser',
      role: 'ambulance' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    mockedAuthService.verifyToken.mockResolvedValue(mockUser);

    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer mock-jwt-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: mockUser });
    expect(mockedAuthService.verifyToken).toHaveBeenCalledWith('mock-jwt-token');
  });

  it('should return 401 if authorization header is missing', async () => {
    const response = await request(app)
      .get('/api/auth/verify');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Missing or invalid authorization header');
  });

  it('should return 401 if authorization header format is invalid', async () => {
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'InvalidFormat token');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Missing or invalid authorization header');
  });

  it('should return 401 if token is expired', async () => {
    mockedAuthService.verifyToken.mockRejectedValue(new Error('Token expired'));

    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer expired-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Session expired, please log in again');
  });

  it('should return 401 if token is invalid', async () => {
    mockedAuthService.verifyToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid token');
  });
});
