// @ts-nocheck
/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides retry logic for operations that may fail temporarily.
 * Uses exponential backoff to avoid overwhelming services.
 * 
 * Requirements: 13.5
 */

import { createLogger } from '../services/logger';

const logger = createLogger('RetryUtil');

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'NetworkError',
    'TimeoutError',
    'ServiceUnavailable',
    'ThrottlingException',
    'ProvisionedThroughputExceededException',
  ],
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  const errorName = error.name || '';
  const errorMessage = error.message || '';
  const errorCode = error.code || '';

  return retryableErrors.some(
    (retryable) =>
      errorName.includes(retryable) ||
      errorMessage.includes(retryable) ||
      errorCode.includes(retryable)
  );
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        logger.warn('Non-retryable error encountered', {
          error: error instanceof Error ? error.message : String(error),
          attempt,
        });
        throw error;
      }

      // Check if we should retry
      if (attempt >= opts.maxAttempts) {
        logger.error('Max retry attempts reached', error, {
          maxAttempts: opts.maxAttempts,
        });
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      logger.info('Retrying operation', {
        attempt,
        maxAttempts: opts.maxAttempts,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry with custom condition
 */
export async function retryWithCondition<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: any) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check custom condition
      if (!shouldRetry(error)) {
        throw error;
      }

      // Check if we should retry
      if (attempt >= opts.maxAttempts) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
