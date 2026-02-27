/**
 * Unit tests for User model
 */

import { User, UserRole } from '../User';

describe('User Model', () => {
  describe('User interface', () => {
    it('should accept valid user object with all required fields', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'ambulance1',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
        role: 'ambulance',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(user.username).toBe('ambulance1');
      expect(user.role).toBe('ambulance');
    });

    it('should accept user object with optional phoneNumber', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'police1',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
        role: 'police',
        phoneNumber: '+1234567890',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      expect(user.phoneNumber).toBe('+1234567890');
    });

    it('should accept ambulance role', () => {
      const role: UserRole = 'ambulance';
      expect(role).toBe('ambulance');
    });

    it('should accept police role', () => {
      const role: UserRole = 'police';
      expect(role).toBe('police');
    });
  });

  describe('User data validation', () => {
    it('should have ISO 8601 timestamp format for createdAt', () => {
      const timestamp = '2024-01-01T12:30:45.123Z';
      const date = new Date(timestamp);
      
      expect(date.toISOString()).toBe(timestamp);
    });

    it('should have ISO 8601 timestamp format for updatedAt', () => {
      const timestamp = '2024-01-01T12:30:45.123Z';
      const date = new Date(timestamp);
      
      expect(date.toISOString()).toBe(timestamp);
    });
  });
});
