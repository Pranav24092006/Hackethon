/**
 * SMS Service Tests
 * 
 * Unit tests for the SMS notification service
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import * as smsService from '../smsService.js';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Mock AWS SNS client
jest.mock('@aws-sdk/client-sns');

const MockedSNSClient = SNSClient as jest.MockedClass<typeof SNSClient>;
const MockedPublishCommand = PublishCommand as jest.MockedClass<typeof PublishCommand>;

describe('SMSService', () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the send method
    mockSend = jest.fn();
    MockedSNSClient.prototype.send = mockSend;
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct E.164 format phone numbers', () => {
      expect(smsService.validatePhoneNumber('+12025551234')).toBe(true);
      expect(smsService.validatePhoneNumber('+442071234567')).toBe(true);
      expect(smsService.validatePhoneNumber('+61412345678')).toBe(true);
      expect(smsService.validatePhoneNumber('+919876543210')).toBe(true);
    });

    it('should reject phone numbers without + prefix', () => {
      expect(smsService.validatePhoneNumber('12025551234')).toBe(false);
      expect(smsService.validatePhoneNumber('442071234567')).toBe(false);
    });

    it('should reject phone numbers with invalid characters', () => {
      expect(smsService.validatePhoneNumber('+1-202-555-1234')).toBe(false);
      expect(smsService.validatePhoneNumber('+1 202 555 1234')).toBe(false);
      expect(smsService.validatePhoneNumber('+1(202)5551234')).toBe(false);
    });

    it('should reject phone numbers that are too short', () => {
      expect(smsService.validatePhoneNumber('+1')).toBe(false);
      expect(smsService.validatePhoneNumber('+12')).toBe(false);
    });

    it('should reject phone numbers that are too long', () => {
      expect(smsService.validatePhoneNumber('+1234567890123456')).toBe(false);
    });

    it('should reject phone numbers starting with +0', () => {
      expect(smsService.validatePhoneNumber('+02025551234')).toBe(false);
    });

    it('should reject empty or null phone numbers', () => {
      expect(smsService.validatePhoneNumber('')).toBe(false);
      expect(smsService.validatePhoneNumber(null as any)).toBe(false);
      expect(smsService.validatePhoneNumber(undefined as any)).toBe(false);
    });

    it('should reject non-string phone numbers', () => {
      expect(smsService.validatePhoneNumber(12025551234 as any)).toBe(false);
      expect(smsService.validatePhoneNumber({} as any)).toBe(false);
    });
  });

  describe('sendSMSNotification', () => {
    it('should send SMS successfully with valid phone number and message', async () => {
      const phoneNumber = '+12025551234';
      const message = 'Emergency alert: Traffic blockage detected';

      mockSend.mockResolvedValue({
        MessageId: 'msg-123',
        $metadata: { httpStatusCode: 200 }
      });

      await smsService.sendSMSNotification(phoneNumber, message);

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(MockedPublishCommand).toHaveBeenCalledWith({
        PhoneNumber: phoneNumber,
        Message: message
      });
    });

    it('should trim whitespace from message', async () => {
      const phoneNumber = '+12025551234';
      const message = '  Emergency alert  ';

      mockSend.mockResolvedValue({
        MessageId: 'msg-123',
        $metadata: { httpStatusCode: 200 }
      });

      await smsService.sendSMSNotification(phoneNumber, message);

      expect(MockedPublishCommand).toHaveBeenCalledWith({
        PhoneNumber: phoneNumber,
        Message: 'Emergency alert'
      });
    });

    it('should throw error for invalid phone number format', async () => {
      const invalidPhoneNumber = '12025551234'; // Missing + prefix
      const message = 'Emergency alert';

      await expect(
        smsService.sendSMSNotification(invalidPhoneNumber, message)
      ).rejects.toThrow('Invalid phone number format');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should throw error for empty message', async () => {
      const phoneNumber = '+12025551234';
      const emptyMessage = '   ';

      await expect(
        smsService.sendSMSNotification(phoneNumber, emptyMessage)
      ).rejects.toThrow('SMS message cannot be empty');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should warn for messages longer than 160 characters', async () => {
      const phoneNumber = '+12025551234';
      const longMessage = 'A'.repeat(200);

      mockSend.mockResolvedValue({
        MessageId: 'msg-123',
        $metadata: { httpStatusCode: 200 }
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await smsService.sendSMSNotification(phoneNumber, longMessage);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeds 160 characters')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should retry on transient network errors', async () => {
      const phoneNumber = '+12025551234';
      const message = 'Emergency alert';

      // Fail first two attempts, succeed on third
      mockSend
        .mockRejectedValueOnce(new Error('NetworkingError: Connection timeout'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce({
          MessageId: 'msg-123',
          $metadata: { httpStatusCode: 200 }
        });

      await smsService.sendSMSNotification(phoneNumber, message, 3);

      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should retry on throttling errors', async () => {
      const phoneNumber = '+12025551234';
      const message = 'Emergency alert';

      const throttlingError = new Error('Throttling');
      throttlingError.name = 'ThrottlingException';

      mockSend
        .mockRejectedValueOnce(throttlingError)
        .mockResolvedValueOnce({
          MessageId: 'msg-123',
          $metadata: { httpStatusCode: 200 }
        });

      await smsService.sendSMSNotification(phoneNumber, message, 3);

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const phoneNumber = '+12025551234';
      const message = 'Emergency alert';

      const invalidParamError = new Error('Invalid parameter');
      invalidParamError.name = 'InvalidParameterException';

      mockSend.mockRejectedValue(invalidParamError);

      await expect(
        smsService.sendSMSNotification(phoneNumber, message, 3)
      ).rejects.toThrow('Failed to send SMS');

      // Should only try once for non-retryable errors
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries exceeded', async () => {
      const phoneNumber = '+12025551234';
      const message = 'Emergency alert';

      const networkError = new Error('NetworkingError');
      mockSend.mockRejectedValue(networkError);

      await expect(
        smsService.sendSMSNotification(phoneNumber, message, 3)
      ).rejects.toThrow('Failed to send SMS after 3 attempts');

      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff for retries', async () => {
      const phoneNumber = '+12025551234';
      const message = 'Emergency alert';

      const networkError = new Error('ETIMEDOUT');
      mockSend.mockRejectedValue(networkError);

      const startTime = Date.now();

      await expect(
        smsService.sendSMSNotification(phoneNumber, message, 3)
      ).rejects.toThrow('Failed to send SMS');

      const elapsedTime = Date.now() - startTime;

      // Should wait approximately 1s + 2s = 3s total
      // Allow some tolerance for test execution time
      expect(elapsedTime).toBeGreaterThanOrEqual(2900);
      expect(elapsedTime).toBeLessThan(4000);
    });

    it('should log success message when SMS is sent', async () => {
      const phoneNumber = '+12025551234';
      const message = 'Emergency alert';

      mockSend.mockResolvedValue({
        MessageId: 'msg-123',
        $metadata: { httpStatusCode: 200 }
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await smsService.sendSMSNotification(phoneNumber, message);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMS sent successfully')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('msg-123')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle service unavailable errors with retry', async () => {
      const phoneNumber = '+12025551234';
      const message = 'Emergency alert';

      const serviceError = new Error('Service unavailable');
      serviceError.name = 'ServiceUnavailable';

      mockSend
        .mockRejectedValueOnce(serviceError)
        .mockResolvedValueOnce({
          MessageId: 'msg-123',
          $metadata: { httpStatusCode: 200 }
        });

      await smsService.sendSMSNotification(phoneNumber, message, 3);

      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('formatAlertMessage', () => {
    it('should format alert message correctly', () => {
      const alertData = {
        ambulanceId: 'AMB-001',
        location: '123 Main St',
        message: 'Heavy traffic blockage'
      };

      const formatted = smsService.formatAlertMessage(alertData);

      expect(formatted).toBe(
        'EMERGENCY ALERT: Ambulance AMB-001 at 123 Main St. Heavy traffic blockage'
      );
    });

    it('should handle different ambulance IDs', () => {
      const alertData = {
        ambulanceId: 'UNIT-42',
        location: 'Downtown intersection',
        message: 'Accident blocking route'
      };

      const formatted = smsService.formatAlertMessage(alertData);

      expect(formatted).toContain('Ambulance UNIT-42');
      expect(formatted).toContain('Downtown intersection');
      expect(formatted).toContain('Accident blocking route');
    });

    it('should create message with all required components', () => {
      const alertData = {
        ambulanceId: 'TEST-123',
        location: 'Test Location',
        message: 'Test Message'
      };

      const formatted = smsService.formatAlertMessage(alertData);

      expect(formatted).toContain('EMERGENCY ALERT');
      expect(formatted).toContain('Ambulance');
      expect(formatted).toContain(alertData.ambulanceId);
      expect(formatted).toContain(alertData.location);
      expect(formatted).toContain(alertData.message);
    });
  });
});
