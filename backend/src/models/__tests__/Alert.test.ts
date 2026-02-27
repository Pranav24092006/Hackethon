/**
 * Unit tests for Alert model
 */

import { Alert, AlertStatus } from '../Alert';

describe('Alert Model', () => {
  describe('Alert interface', () => {
    it('should accept valid alert object with all required fields', () => {
      const alert: Alert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ambulanceId: '987e6543-e21b-12d3-a456-426614174999',
        ambulanceLocation: {
          lat: 40.7128,
          lng: -74.0060
        },
        destination: {
          lat: 40.7589,
          lng: -73.9851
        },
        congestionPoint: {
          lat: 40.7300,
          lng: -74.0000
        },
        message: 'Heavy traffic on 5th Avenue',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      expect(alert.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(alert.ambulanceId).toBe('987e6543-e21b-12d3-a456-426614174999');
      expect(alert.status).toBe('pending');
      expect(alert.message).toBe('Heavy traffic on 5th Avenue');
    });

    it('should accept alert object with optional clearedAt field', () => {
      const alert: Alert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ambulanceId: '987e6543-e21b-12d3-a456-426614174999',
        ambulanceLocation: {
          lat: 40.7128,
          lng: -74.0060
        },
        destination: {
          lat: 40.7589,
          lng: -73.9851
        },
        congestionPoint: {
          lat: 40.7300,
          lng: -74.0000
        },
        message: 'Heavy traffic on 5th Avenue',
        status: 'cleared',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:05:00.000Z',
        clearedAt: '2024-01-01T00:05:00.000Z'
      };

      expect(alert.clearedAt).toBe('2024-01-01T00:05:00.000Z');
    });

    it('should accept pending status', () => {
      const status: AlertStatus = 'pending';
      expect(status).toBe('pending');
    });

    it('should accept dispatched status', () => {
      const status: AlertStatus = 'dispatched';
      expect(status).toBe('dispatched');
    });

    it('should accept cleared status', () => {
      const status: AlertStatus = 'cleared';
      expect(status).toBe('cleared');
    });

    it('should accept cancelled status', () => {
      const status: AlertStatus = 'cancelled';
      expect(status).toBe('cancelled');
    });
  });

  describe('Alert location data validation', () => {
    it('should have valid latitude and longitude for ambulanceLocation', () => {
      const location = {
        lat: 40.7128,
        lng: -74.0060
      };

      expect(location.lat).toBeGreaterThanOrEqual(-90);
      expect(location.lat).toBeLessThanOrEqual(90);
      expect(location.lng).toBeGreaterThanOrEqual(-180);
      expect(location.lng).toBeLessThanOrEqual(180);
    });

    it('should have valid latitude and longitude for destination', () => {
      const location = {
        lat: 40.7589,
        lng: -73.9851
      };

      expect(location.lat).toBeGreaterThanOrEqual(-90);
      expect(location.lat).toBeLessThanOrEqual(90);
      expect(location.lng).toBeGreaterThanOrEqual(-180);
      expect(location.lng).toBeLessThanOrEqual(180);
    });

    it('should have valid latitude and longitude for congestionPoint', () => {
      const location = {
        lat: 40.7300,
        lng: -74.0000
      };

      expect(location.lat).toBeGreaterThanOrEqual(-90);
      expect(location.lat).toBeLessThanOrEqual(90);
      expect(location.lng).toBeGreaterThanOrEqual(-180);
      expect(location.lng).toBeLessThanOrEqual(180);
    });

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

    it('should have ISO 8601 timestamp format for clearedAt when present', () => {
      const timestamp = '2024-01-01T12:35:45.123Z';
      const date = new Date(timestamp);
      
      expect(date.toISOString()).toBe(timestamp);
    });
  });
});
