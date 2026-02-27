// @ts-nocheck
/**
 * Logger Service with CloudWatch Integration
 * 
 * Provides structured logging with CloudWatch Logs integration.
 * Logs are sent to CloudWatch in production, console in development.
 * 
 * Requirements: 12.4
 */

import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

const LOG_GROUP_NAME = '/aws/emergency-route-optimizer';
const LOG_STREAM_NAME = `app-${new Date().toISOString().split('T')[0]}`;

const client = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

let logStreamCreated = false;

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: any;
}

/**
 * Create log stream if it doesn't exist
 */
async function ensureLogStream(): Promise<void> {
  if (logStreamCreated) return;

  try {
    const command = new CreateLogStreamCommand({
      logGroupName: LOG_GROUP_NAME,
      logStreamName: LOG_STREAM_NAME,
    });

    await client.send(command);
    logStreamCreated = true;
  } catch (error: any) {
    if (error.name !== 'ResourceAlreadyExistsException') {
      console.error('Failed to create log stream:', error);
    } else {
      logStreamCreated = true;
    }
  }
}

/**
 * Send log to CloudWatch
 */
async function sendToCloudWatch(entry: LogEntry): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    return; // Only send to CloudWatch in production
  }

  try {
    await ensureLogStream();

    const command = new PutLogEventsCommand({
      logGroupName: LOG_GROUP_NAME,
      logStreamName: LOG_STREAM_NAME,
      logEvents: [
        {
          timestamp: entry.timestamp,
          message: JSON.stringify({
            level: entry.level,
            message: entry.message,
            context: entry.context,
          }),
        },
      ],
    });

    await client.send(command);
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('Failed to send log to CloudWatch:', error);
  }
}

/**
 * Format log message for console
 */
function formatConsoleMessage(entry: LogEntry): string {
  const timestamp = new Date(entry.timestamp).toISOString();
  const level = entry.level.padEnd(5);
  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `[${timestamp}] ${level} ${entry.message}${context}`;
}

/**
 * Log a message
 */
async function log(level: LogLevel, message: string, context?: any): Promise<void> {
  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    message,
    context,
  };

  // Always log to console
  const consoleMessage = formatConsoleMessage(entry);
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(consoleMessage);
      break;
    case LogLevel.INFO:
      console.info(consoleMessage);
      break;
    case LogLevel.WARN:
      console.warn(consoleMessage);
      break;
    case LogLevel.ERROR:
      console.error(consoleMessage);
      break;
  }

  // Send to CloudWatch in production
  await sendToCloudWatch(entry);
}

/**
 * Logger class with convenience methods
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  debug(message: string, data?: any): void {
    log(LogLevel.DEBUG, message, { ...data, context: this.context });
  }

  info(message: string, data?: any): void {
    log(LogLevel.INFO, message, { ...data, context: this.context });
  }

  warn(message: string, data?: any): void {
    log(LogLevel.WARN, message, { ...data, context: this.context });
  }

  error(message: string, error?: Error | any, data?: any): void {
    const errorData = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error;

    log(LogLevel.ERROR, message, {
      ...data,
      error: errorData,
      context: this.context,
    });
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Export default logger
export const logger = new Logger('Application');
