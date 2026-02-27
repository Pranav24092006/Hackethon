/**
 * SMS Service
 * 
 * Service for sending SMS notifications via AWS SNS.
 * Handles phone number validation, retry logic, and error handling.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { SNSClient, PublishCommand, PublishCommandInput } from '@aws-sdk/client-sns';

// Configure AWS SNS client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export class SMSServiceError extends Error {
  constructor(message: string, public code: string, public originalError?: Error) {
    super(message);
    this.name = 'SMSServiceError';
  }
}

/**
 * Validate phone number in E.164 format
 * E.164 format: +[country code][subscriber number]
 * Example: +12025551234
 * 
 * @param phoneNumber - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }
  
  // E.164 format: starts with +, followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Send SMS notification via AWS SNS
 * Includes retry logic for transient failures
 * 
 * @param phoneNumber - Phone number in E.164 format (e.g., +12025551234)
 * @param message - SMS message content (max 160 characters recommended)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise that resolves when SMS is sent successfully
 */
export async function sendSMSNotification(
  phoneNumber: string,
  message: string,
  maxRetries: number = 3
): Promise<void> {
  // Validate phone number
  if (!validatePhoneNumber(phoneNumber)) {
    throw new SMSServiceError(
      `Invalid phone number format. Expected E.164 format (e.g., +12025551234), got: ${phoneNumber}`,
      'INVALID_PHONE_NUMBER'
    );
  }
  
  // Validate message
  if (!message || message.trim().length === 0) {
    throw new SMSServiceError(
      'SMS message cannot be empty',
      'EMPTY_MESSAGE'
    );
  }
  
  // Warn if message is too long (SMS standard is 160 characters)
  if (message.length > 160) {
    console.warn(`SMS message exceeds 160 characters (${message.length} chars). May be split into multiple messages.`);
  }
  
  const params: PublishCommandInput = {
    PhoneNumber: phoneNumber,
    Message: message.trim()
  };
  
  let lastError: Error | undefined;
  
  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new PublishCommand(params);
      const response = await snsClient.send(command);
      
      console.log(`SMS sent successfully to ${phoneNumber}. MessageId: ${response.MessageId}`);
      return; // Success
      
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error);
      
      if (!isRetryable || attempt === maxRetries) {
        // Non-retryable error or max retries reached
        break;
      }
      
      // Calculate exponential backoff delay: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      console.warn(`SMS delivery failed (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`);
      
      await sleep(delayMs);
    }
  }
  
  // All retries failed
  throw new SMSServiceError(
    `Failed to send SMS after ${maxRetries} attempts: ${lastError?.message}`,
    'SMS_DELIVERY_FAILED',
    lastError
  );
}

/**
 * Determine if an error is retryable
 * Transient errors (network issues, throttling) are retryable
 * Permanent errors (invalid credentials, invalid phone number) are not
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.name || error.code || '';
  const errorMessage = error.message || '';
  
  // Retryable error codes
  const retryableErrors = [
    'NetworkingError',
    'TimeoutError',
    'RequestTimeout',
    'Throttling',
    'ThrottlingException',
    'TooManyRequestsException',
    'ServiceUnavailable',
    'InternalError',
    'InternalServerError'
  ];
  
  // Check if error code matches retryable errors
  if (retryableErrors.some(code => errorCode.includes(code))) {
    return true;
  }
  
  // Check error message for network-related issues
  if (errorMessage.includes('ECONNRESET') || 
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND')) {
    return true;
  }
  
  return false;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format alert message for SMS
 * Creates a concise SMS message from alert data
 * 
 * @param alertData - Alert information
 * @returns Formatted SMS message
 */
export function formatAlertMessage(alertData: {
  ambulanceId: string;
  location: string;
  message: string;
}): string {
  return `EMERGENCY ALERT: Ambulance ${alertData.ambulanceId} at ${alertData.location}. ${alertData.message}`;
}
