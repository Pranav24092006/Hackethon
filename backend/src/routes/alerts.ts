/**
 * Alert API Routes
 * 
 * Provides REST API endpoints for emergency alert management:
 * - POST /api/alerts - Create a new emergency alert
 * - PUT /api/alerts/:id/status - Update alert status
 * - GET /api/alerts - Get all active alerts
 * - GET /api/alerts/ambulance/:ambulanceId - Get alerts for specific ambulance
 * 
 * Requirements: 5.1, 7.1, 7.2
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { Router, Request, Response } from 'express';
import {
  createAlert,
  updateAlertStatus,
  getActiveAlerts,
  getAlertsForAmbulance,
  AlertServiceError,
  CreateAlertRequest
} from '../services/alertService.js';
import { AlertStatus } from '../models/Alert.js';

const router = Router();

/**
 * POST /api/alerts
 * Create a new emergency alert
 * 
 * Request body:
 * {
 *   ambulanceId: string,
 *   ambulanceLocation: { lat: number, lng: number },
 *   destination: { lat: number, lng: number },
 *   congestionPoint: { lat: number, lng: number },
 *   message: string,
 *   phoneNumber?: string  // Optional: Phone number for SMS notification (E.164 format)
 * }
 * 
 * Response:
 * 201 Created - { alert: Alert }
 * 400 Bad Request - { error: string }
 * 500 Internal Server Error - { error: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { ambulanceId, ambulanceLocation, destination, congestionPoint, message, phoneNumber } = req.body;

    // Validate required fields
    if (!ambulanceId || !ambulanceLocation || !destination || !congestionPoint || !message) {
      return res.status(400).json({
        error: 'Missing required fields: ambulanceId, ambulanceLocation, destination, congestionPoint, and message are required'
      });
    }

    // Create alert request
    const alertRequest: CreateAlertRequest = {
      ambulanceId,
      ambulanceLocation,
      destination,
      congestionPoint,
      message
    };

    // Create alert with optional SMS notification
    const alert = await createAlert(alertRequest, phoneNumber);

    return res.status(201).json({ alert });
  } catch (error) {
    if (error instanceof AlertServiceError) {
      // Handle validation errors
      return res.status(400).json({ error: error.message });
    }
    
    if (error instanceof Error) {
      // Generic server error
      return res.status(500).json({
        error: 'Failed to create alert',
        details: error.message
      });
    }
    
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

/**
 * PUT /api/alerts/:id/status
 * Update the status of an alert
 * 
 * Request params:
 * - id: Alert ID
 * 
 * Request body:
 * {
 *   status: 'pending' | 'dispatched' | 'cleared' | 'cancelled'
 * }
 * 
 * Response:
 * 200 OK - { alert: Alert }
 * 400 Bad Request - { error: string }
 * 404 Not Found - { error: string }
 * 500 Internal Server Error - { error: string }
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        error: 'Missing required field: status is required'
      });
    }

    // Validate status value
    const validStatuses: AlertStatus[] = ['pending', 'dispatched', 'cleared', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: must be one of ${validStatuses.join(', ')}`
      });
    }

    // Update alert status
    const alert = await updateAlertStatus(id, status as AlertStatus);

    return res.status(200).json({ alert });
  } catch (error) {
    if (error instanceof AlertServiceError) {
      // Handle validation errors
      return res.status(400).json({ error: error.message });
    }
    
    if (error instanceof Error) {
      // Handle not found errors
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      // Generic server error
      return res.status(500).json({
        error: 'Failed to update alert status',
        details: error.message
      });
    }
    
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

/**
 * GET /api/alerts
 * Get all active alerts (pending or dispatched)
 * Automatically filters out expired alerts (older than 2 hours)
 * 
 * Response:
 * 200 OK - { alerts: Alert[] }
 * 500 Internal Server Error - { error: string }
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const alerts = await getActiveAlerts();

    return res.status(200).json({ alerts });
  } catch (error) {
    if (error instanceof Error) {
      // Generic server error
      return res.status(500).json({
        error: 'Failed to retrieve alerts',
        details: error.message
      });
    }
    
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

/**
 * GET /api/alerts/ambulance/:ambulanceId
 * Get all alerts for a specific ambulance
 * 
 * Request params:
 * - ambulanceId: Ambulance ID
 * 
 * Response:
 * 200 OK - { alerts: Alert[] }
 * 400 Bad Request - { error: string }
 * 500 Internal Server Error - { error: string }
 */
router.get('/ambulance/:ambulanceId', async (req: Request, res: Response) => {
  try {
    const { ambulanceId } = req.params;

    // Validate ambulance ID
    if (!ambulanceId) {
      return res.status(400).json({
        error: 'Ambulance ID is required'
      });
    }

    const alerts = await getAlertsForAmbulance(ambulanceId);

    return res.status(200).json({ alerts });
  } catch (error) {
    if (error instanceof AlertServiceError) {
      // Handle validation errors
      return res.status(400).json({ error: error.message });
    }
    
    if (error instanceof Error) {
      // Generic server error
      return res.status(500).json({
        error: 'Failed to retrieve alerts for ambulance',
        details: error.message
      });
    }
    
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

export default router;
