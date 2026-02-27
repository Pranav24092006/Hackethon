/**
 * Alert Service Tests
 * 
 * Unit tests for the AlertService business logic layer
 */

import * as alertService from '../alertService.js';
import * as db from '../databaseService.js';
import * as smsService from '../smsService.js';
import { Alert, AlertStatus } from '../../models/Alert.js';

// Mock the database service
jest.mock('../databaseService.js');
// Mock the SMS service
jest.mock('../smsService.js');

const mockedDb = db as jest.Mocked<typeof db>;
const mockedSmsService = smsService as jest.Mocked<typeof smsService>;

describe('AlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAlert', () => {
    beforeEach(() => {
      // Mock SMS service functions
      mockedSmsService.formatAlertMessage = jest.fn((data) => 
        `EMERGENCY ALERT: Ambulance ${data.ambulanceId} at ${data.location}. ${data.message}`
      );
      mockedSmsService.sendSMSNotification = jest.fn().mockResolvedValue(undefined);
    });

    it('should create an alert with valid data', async () => {
      const request = {
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on Main St'
      };

      const mockAlert: Alert = {
        id: 'alert-123',
        ...request,
        status: 'pending',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z'
      };

      mockedDb.createAlert.mockResolvedValue(mockAlert);

      const result = await alertService.createAlert(request);

      expect(result).toEqual(mockAlert);
      expect(mockedDb.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          ambulanceId: request.ambulanceId,
          ambulanceLocation: request.ambulanceLocation,
          destination: request.destination,
          congestionPoint: request.congestionPoint,
          message: request.message,
          status: 'pending'
        })
      );
    });

    it('should trim whitespace from message', async () => {
      const request = {
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: '  Traffic alert  '
      };

      const mockAlert: Alert = {
        id: 'alert-123',
        ambulanceId: request.ambulanceId,
        ambulanceLocation: request.ambulanceLocation,
        destination: request.destination,
        congestionPoint: request.congestionPoint,
        message: 'Traffic alert',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z'
      };

      mockedDb.createAlert.mockResolvedValue(mockAlert);

      await alertService.createAlert(request);

      expect(mockedDb.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Traffic alert'
        })
      );
    });

    it('should throw error if ambulanceId is missing', async () => {
      const request = {
        ambulanceId: '',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Traffic alert'
      };

      await expect(alertService.createAlert(request)).rejects.toThrow('Ambulance ID is required');
    });

    it('should throw error if message is empty', async () => {
      const request = {
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: '   '
      };

      await expect(alertService.createAlert(request)).rejects.toThrow('Alert message is required');
    });

    it('should throw error if coordinates are invalid', async () => {
      const request = {
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 91, lng: -74.0060 }, // Invalid latitude
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Traffic alert'
      };

      await expect(alertService.createAlert(request)).rejects.toThrow('must be between -90 and 90');
    });

    it('should throw error if longitude is out of range', async () => {
      const request = {
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: 181 }, // Invalid longitude
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Traffic alert'
      };

      await expect(alertService.createAlert(request)).rejects.toThrow('must be between -180 and 180');
    });

    it('should send SMS notification when phone number is provided', async () => {
      const request = {
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on Main St'
      };

      const phoneNumber = '+12025551234';

      const mockAlert: Alert = {
        id: 'alert-123',
        ...request,
        status: 'pending',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z'
      };

      mockedDb.createAlert.mockResolvedValue(mockAlert);

      await alertService.createAlert(request, phoneNumber);

      expect(mockedSmsService.formatAlertMessage).toHaveBeenCalledWith({
        ambulanceId: request.ambulanceId,
        location: expect.any(String),
        message: request.message
      });

      expect(mockedSmsService.sendSMSNotification).toHaveBeenCalledWith(
        phoneNumber,
        expect.stringContaining('EMERGENCY ALERT')
      );
    });

    it('should not send SMS notification when phone number is not provided', async () => {
      const request = {
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on Main St'
      };

      const mockAlert: Alert = {
        id: 'alert-123',
        ...request,
        status: 'pending',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z'
      };

      mockedDb.createAlert.mockResolvedValue(mockAlert);

      await alertService.createAlert(request);

      expect(mockedSmsService.sendSMSNotification).not.toHaveBeenCalled();
    });

    it('should continue alert creation even if SMS fails', async () => {
      const request = {
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on Main St'
      };

      const phoneNumber = '+12025551234';

      const mockAlert: Alert = {
        id: 'alert-123',
        ...request,
        status: 'pending',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z'
      };

      mockedDb.createAlert.mockResolvedValue(mockAlert);
      mockedSmsService.sendSMSNotification.mockRejectedValue(new Error('SMS delivery failed'));

      // Mock console methods to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw error even if SMS fails
      const result = await alertService.createAlert(request, phoneNumber);

      expect(result).toEqual(mockAlert);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send SMS notification'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('updateAlertStatus', () => {
    it('should update alert status to dispatched', async () => {
      const alertId = 'alert-123';
      const status: AlertStatus = 'dispatched';

      const mockAlert: Alert = {
        id: alertId,
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Traffic alert',
        status: 'dispatched',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:05:00.000Z'
      };

      mockedDb.updateAlertStatus.mockResolvedValue(mockAlert);

      const result = await alertService.updateAlertStatus(alertId, status);

      expect(result).toEqual(mockAlert);
      expect(mockedDb.updateAlertStatus).toHaveBeenCalledWith(alertId, status);
    });

    it('should update alert status to cleared', async () => {
      const alertId = 'alert-123';
      const status: AlertStatus = 'cleared';

      const mockAlert: Alert = {
        id: alertId,
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Traffic alert',
        status: 'cleared',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:10:00.000Z',
        clearedAt: '2024-01-01T12:10:00.000Z'
      };

      mockedDb.updateAlertStatus.mockResolvedValue(mockAlert);

      const result = await alertService.updateAlertStatus(alertId, status);

      expect(result.status).toBe('cleared');
      expect(mockedDb.updateAlertStatus).toHaveBeenCalledWith(alertId, status);
    });

    it('should throw error if alertId is missing', async () => {
      await expect(alertService.updateAlertStatus('', 'dispatched')).rejects.toThrow('Alert ID is required');
    });

    it('should throw error if status is invalid', async () => {
      await expect(alertService.updateAlertStatus('alert-123', 'invalid' as AlertStatus))
        .rejects.toThrow('Invalid status');
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts that are not expired', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Recent alert',
          status: 'pending',
          createdAt: oneHourAgo.toISOString(),
          updatedAt: oneHourAgo.toISOString()
        },
        {
          id: 'alert-2',
          ambulanceId: 'amb-456',
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Old alert',
          status: 'pending',
          createdAt: threeHoursAgo.toISOString(),
          updatedAt: threeHoursAgo.toISOString()
        }
      ];

      mockedDb.getActiveAlerts.mockResolvedValue(mockAlerts);

      const result = await alertService.getActiveAlerts();

      // Should only return the recent alert, not the expired one
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert-1');
    });

    it('should return empty array if no active alerts', async () => {
      mockedDb.getActiveAlerts.mockResolvedValue([]);

      const result = await alertService.getActiveAlerts();

      expect(result).toEqual([]);
    });

    it('should filter out all alerts older than 2 hours', async () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Old alert',
          status: 'pending',
          createdAt: threeHoursAgo.toISOString(),
          updatedAt: threeHoursAgo.toISOString()
        }
      ];

      mockedDb.getActiveAlerts.mockResolvedValue(mockAlerts);

      const result = await alertService.getActiveAlerts();

      expect(result).toEqual([]);
    });
  });

  describe('getAlertsForAmbulance', () => {
    it('should return alerts for specific ambulance', async () => {
      const ambulanceId = 'amb-123';

      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          ambulanceId: ambulanceId,
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Alert 1',
          status: 'pending',
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z'
        },
        {
          id: 'alert-2',
          ambulanceId: ambulanceId,
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Alert 2',
          status: 'cleared',
          createdAt: '2024-01-01T11:00:00.000Z',
          updatedAt: '2024-01-01T11:30:00.000Z',
          clearedAt: '2024-01-01T11:30:00.000Z'
        }
      ];

      mockedDb.getAlertsByAmbulanceId.mockResolvedValue(mockAlerts);

      const result = await alertService.getAlertsForAmbulance(ambulanceId);

      expect(result).toEqual(mockAlerts);
      expect(mockedDb.getAlertsByAmbulanceId).toHaveBeenCalledWith(ambulanceId);
    });

    it('should throw error if ambulanceId is missing', async () => {
      await expect(alertService.getAlertsForAmbulance('')).rejects.toThrow('Ambulance ID is required');
    });
  });

  describe('getAlertById', () => {
    it('should return alert by ID', async () => {
      const alertId = 'alert-123';

      const mockAlert: Alert = {
        id: alertId,
        ambulanceId: 'amb-123',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Traffic alert',
        status: 'pending',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z'
      };

      mockedDb.getAlertById.mockResolvedValue(mockAlert);

      const result = await alertService.getAlertById(alertId);

      expect(result).toEqual(mockAlert);
      expect(mockedDb.getAlertById).toHaveBeenCalledWith(alertId);
    });

    it('should throw error if alertId is missing', async () => {
      await expect(alertService.getAlertById('')).rejects.toThrow('Alert ID is required');
    });
  });

  describe('expireOldAlerts', () => {
    it('should expire alerts older than 2 hours', async () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Old alert',
          status: 'pending',
          createdAt: threeHoursAgo.toISOString(),
          updatedAt: threeHoursAgo.toISOString()
        },
        {
          id: 'alert-2',
          ambulanceId: 'amb-456',
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Recent alert',
          status: 'pending',
          createdAt: oneHourAgo.toISOString(),
          updatedAt: oneHourAgo.toISOString()
        }
      ];

      mockedDb.getActiveAlerts.mockResolvedValue(mockAlerts);
      mockedDb.updateAlertStatus.mockResolvedValue({
        ...mockAlerts[0],
        status: 'cancelled',
        updatedAt: now.toISOString()
      });

      const expiredCount = await alertService.expireOldAlerts();

      expect(expiredCount).toBe(1);
      expect(mockedDb.updateAlertStatus).toHaveBeenCalledWith('alert-1', 'cancelled');
      expect(mockedDb.updateAlertStatus).toHaveBeenCalledTimes(1);
    });

    it('should return 0 if no alerts to expire', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Recent alert',
          status: 'pending',
          createdAt: oneHourAgo.toISOString(),
          updatedAt: oneHourAgo.toISOString()
        }
      ];

      mockedDb.getActiveAlerts.mockResolvedValue(mockAlerts);

      const expiredCount = await alertService.expireOldAlerts();

      expect(expiredCount).toBe(0);
      expect(mockedDb.updateAlertStatus).not.toHaveBeenCalled();
    });

    it('should continue processing if one alert fails to expire', async () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Old alert 1',
          status: 'pending',
          createdAt: threeHoursAgo.toISOString(),
          updatedAt: threeHoursAgo.toISOString()
        },
        {
          id: 'alert-2',
          ambulanceId: 'amb-456',
          ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7300, lng: -74.0000 },
          message: 'Old alert 2',
          status: 'pending',
          createdAt: threeHoursAgo.toISOString(),
          updatedAt: threeHoursAgo.toISOString()
        }
      ];

      mockedDb.getActiveAlerts.mockResolvedValue(mockAlerts);
      mockedDb.updateAlertStatus
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({
          ...mockAlerts[1],
          status: 'cancelled',
          updatedAt: now.toISOString()
        });

      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const expiredCount = await alertService.expireOldAlerts();

      expect(expiredCount).toBe(1);
      expect(mockedDb.updateAlertStatus).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to expire alert alert-1'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
