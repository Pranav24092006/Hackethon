/**
 * Alert Service
 * 
 * High-level service for managing emergency alerts with business logic.
 * Provides CRUD operations with auto-expiration and validation.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertStatus } from '../models/Alert.js';
import * as db from './databaseService.js';
import * as smsService from './smsService.js';

export interface CreateAlertRequest {
  ambulanceId: string;
  ambulanceLocation: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  congestionPoint: {
    lat: number;
    lng: number;
  };
  message: string;
}

export class AlertServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AlertServiceError';
  }
}

/**
 * Create a new emergency alert
 * 
 * @param request - Alert creation request with all required fields
 * @param phoneNumber - Optional phone number for SMS notification (E.164 format)
 * @returns The created alert
 */
export async function createAlert(
  request: CreateAlertRequest, 
  phoneNumber?: string
): Promise<Alert> {
  // Validate request
  if (!request.ambulanceId) {
    throw new AlertServiceError('Ambulance ID is required', 'MISSING_AMBULANCE_ID');
  }
  
  if (!request.message || request.message.trim().length === 0) {
    throw new AlertServiceError('Alert message is required', 'MISSING_MESSAGE');
  }
  
  // Validate coordinates
  validateCoordinates(request.ambulanceLocation, 'ambulanceLocation');
  validateCoordinates(request.destination, 'destination');
  validateCoordinates(request.congestionPoint, 'congestionPoint');
  
  // Create alert object
  const now = new Date().toISOString();
  const alert: Alert = {
    id: uuidv4(),
    ambulanceId: request.ambulanceId,
    ambulanceLocation: request.ambulanceLocation,
    destination: request.destination,
    congestionPoint: request.congestionPoint,
    message: request.message.trim(),
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };
  
  // Persist to database
  const createdAlert = await db.createAlert(alert);
  
  // Send SMS notification if phone number is provided
  if (phoneNumber) {
    try {
      const locationStr = `${request.congestionPoint.lat.toFixed(4)}, ${request.congestionPoint.lng.toFixed(4)}`;
      const smsMessage = smsService.formatAlertMessage({
        ambulanceId: request.ambulanceId,
        location: locationStr,
        message: request.message.trim()
      });
      
      await smsService.sendSMSNotification(phoneNumber, smsMessage);
      console.log(`SMS notification sent for alert ${alert.id}`);
    } catch (error) {
      // Log SMS error but don't fail the alert creation
      // The alert was already persisted, so we continue with Socket.io notification
      console.error(`Failed to send SMS notification for alert ${alert.id}:`, error);
      console.warn('SMS notification may be delayed. Alert created successfully.');
    }
  }
  
  return createdAlert;
}

/**
 * Update the status of an alert
 * 
 * @param alertId - The ID of the alert to update
 * @param status - The new status
 * @returns The updated alert
 */
export async function updateAlertStatus(alertId: string, status: AlertStatus): Promise<Alert> {
  if (!alertId) {
    throw new AlertServiceError('Alert ID is required', 'MISSING_ALERT_ID');
  }
  
  // Validate status
  const validStatuses: AlertStatus[] = ['pending', 'dispatched', 'cleared', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AlertServiceError(`Invalid status: ${status}`, 'INVALID_STATUS');
  }
  
  // Update in database
  return await db.updateAlertStatus(alertId, status);
}

/**
 * Get all active alerts (pending or dispatched)
 * Filters out expired alerts (older than 2 hours)
 * 
 * @returns Array of active, non-expired alerts
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  const alerts = await db.getActiveAlerts();
  
  // Filter out expired alerts (older than 2 hours)
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
  return alerts.filter(alert => {
    const createdAt = new Date(alert.createdAt);
    return createdAt >= twoHoursAgo;
  });
}

/**
 * Get all alerts for a specific ambulance
 * 
 * @param ambulanceId - The ID of the ambulance
 * @returns Array of alerts for the ambulance
 */
export async function getAlertsForAmbulance(ambulanceId: string): Promise<Alert[]> {
  if (!ambulanceId) {
    throw new AlertServiceError('Ambulance ID is required', 'MISSING_AMBULANCE_ID');
  }
  
  return await db.getAlertsByAmbulanceId(ambulanceId);
}

/**
 * Get an alert by ID
 * 
 * @param alertId - The ID of the alert
 * @returns The alert
 */
export async function getAlertById(alertId: string): Promise<Alert> {
  if (!alertId) {
    throw new AlertServiceError('Alert ID is required', 'MISSING_ALERT_ID');
  }
  
  return await db.getAlertById(alertId);
}

/**
 * Auto-expire old alerts
 * Updates alerts older than 2 hours to 'cancelled' status
 * This should be called periodically (e.g., every 15 minutes)
 * 
 * @returns Number of alerts expired
 */
export async function expireOldAlerts(): Promise<number> {
  const activeAlerts = await db.getActiveAlerts();
  
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
  let expiredCount = 0;
  
  for (const alert of activeAlerts) {
    const createdAt = new Date(alert.createdAt);
    
    if (createdAt < twoHoursAgo) {
      try {
        await db.updateAlertStatus(alert.id, 'cancelled');
        expiredCount++;
      } catch (error) {
        // Log error but continue processing other alerts
        console.error(`Failed to expire alert ${alert.id}:`, error);
      }
    }
  }
  
  return expiredCount;
}

/**
 * Validate coordinates
 */
function validateCoordinates(coords: { lat: number; lng: number }, fieldName: string): void {
  if (!coords) {
    throw new AlertServiceError(`${fieldName} is required`, 'MISSING_COORDINATES');
  }
  
  if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    throw new AlertServiceError(`${fieldName} must have numeric lat and lng`, 'INVALID_COORDINATES');
  }
  
  if (coords.lat < -90 || coords.lat > 90) {
    throw new AlertServiceError(`${fieldName}.lat must be between -90 and 90`, 'INVALID_LATITUDE');
  }
  
  if (coords.lng < -180 || coords.lng > 180) {
    throw new AlertServiceError(`${fieldName}.lng must be between -180 and 180`, 'INVALID_LONGITUDE');
  }
}
