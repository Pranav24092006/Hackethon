/**
 * Authentication API Routes
 * 
 * Provides REST API endpoints for user authentication:
 * - POST /api/auth/register - Register a new user
 * - POST /api/auth/login - Authenticate and get JWT token
 * - GET /api/auth/verify - Verify JWT token validity
 * 
 * Requirements: 1.2, 1.5
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { Router, Request, Response } from 'express';
import { register, login, verifyToken } from '../services/authService.js';
import { UserRole } from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 * 
 * Request body:
 * {
 *   username: string,
 *   password: string,
 *   role: 'ambulance' | 'police'
 * }
 * 
 * Response:
 * 201 Created - { user: User }
 * 400 Bad Request - { error: string }
 * 409 Conflict - { error: string } (username already exists)
 * 500 Internal Server Error - { error: string }
 */
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { username, password, role } = req.body;

  // Validate required fields
  if (!username || !password || !role) {
    throw new AppError('Missing required fields: username, password, and role are required', 400);
  }

  // Validate role
  if (role !== 'ambulance' && role !== 'police') {
    throw new AppError('Invalid role: must be "ambulance" or "police"', 400);
  }

  // Validate username format
  if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
    throw new AppError('Invalid username: must be between 3 and 50 characters', 400);
  }

  // Validate password format
  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError('Invalid password: must be at least 8 characters', 400);
  }

  // Register user
  try {
    const user = await register(username, password, role as UserRole);
    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === 'Username already exists') {
      throw new AppError('Username already exists', 409);
    }
    throw error;
  }
}));

/**
 * POST /api/auth/login
 * Authenticate user and receive JWT token
 * 
 * Request body:
 * {
 *   username: string,
 *   password: string
 * }
 * 
 * Response:
 * 200 OK - { token: string, user: User }
 * 400 Bad Request - { error: string }
 * 401 Unauthorized - { error: string } (invalid credentials)
 * 500 Internal Server Error - { error: string }
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    throw new AppError('Missing required fields: username and password are required', 400);
  }

  // Validate types
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new AppError('Invalid credentials format', 400);
  }

  // Authenticate user
  try {
    const result = await login(username, password);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid username or password') {
      throw new AppError('Invalid username or password', 401);
    }
    throw error;
  }
}));

/**
 * GET /api/auth/verify
 * Verify JWT token validity
 * 
 * Request headers:
 * Authorization: Bearer <token>
 * 
 * Response:
 * 200 OK - { user: User }
 * 401 Unauthorized - { error: string } (invalid or expired token)
 * 500 Internal Server Error - { error: string }
 */
router.get('/verify', asyncHandler(async (req: Request, res: Response) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Missing or invalid authorization header', 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify token
  try {
    const user = await verifyToken(token);
    return res.status(200).json({ user });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        throw new AppError('Session expired, please log in again', 401);
      }
      if (error.message === 'Invalid token') {
        throw new AppError('Invalid token', 401);
      }
    }
    throw error;
  }
}));

export default router;
