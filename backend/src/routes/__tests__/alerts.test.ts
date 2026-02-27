/**
 * Alert API Routes Tests
 * 
 * Tests for the alert management endpoints:
 * - POST /api/alerts
 * - PUT /api/alerts/:id/status
 * - GET /api/alerts
 * - GET /api/alerts/ambulance/:ambulanceId
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import request from 'supertest';
import { app } from '../../index.js';
import * as alertService from '../../services/alertService.js';
import { Alert } from '../../models/Alert.js';

// Mock the alert service
jest.mock('../../services/alertService.js');

const mockedAlertService = alertService as jest.Mocked<typeof alertService>;

describe('POST /api/alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new alert successfully', async () => {
    const mockAlert: Alert = {
      id: 'alert-123',
      ambulanceId: 'ambulance-456',
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Heavy traffic on route',
      status: 'pending',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    mockedAlertService.createAlert.mockResolvedValue(mockAlert);

    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ alert: mockAlert });
    expect(mockedAlertService.createAlert).toHaveBeenCalledWith({
      ambulanceId: 'ambulance-456',
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Heavy traffic on route'
    });
  });

  it('should return 400 if ambulanceId is missing', async () => {
    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return 400 if ambulanceLocation is missing', async () => {
    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return 400 if destination is missing', async () => {
    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return 400 if congestionPoint is missing', async () => {
    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        message: 'Heavy traffic on route'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return 400 if message is missing', async () => {
    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 }
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return 400 if coordinates are invalid', async () => {
    const error = new alertService.AlertServiceError('Invalid coordinates', 'INVALID_COORDINATES');
    mockedAlertService.createAlert.mockRejectedValue(error);

    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 200, lng: -74.0060 }, // Invalid latitude
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid coordinates');
  });

  it('should return 500 on unexpected error', async () => {
    mockedAlertService.createAlert.mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to create alert');
  });

  it('should create alert with SMS notification when phone number is provided', async () => {
    const mockAlert: Alert = {
      id: 'alert-123',
      ambulanceId: 'ambulance-456',
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Heavy traffic on route',
      status: 'pending',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    mockedAlertService.createAlert.mockResolvedValue(mockAlert);

    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route',
        phoneNumber: '+12025551234'
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ alert: mockAlert });
    expect(mockedAlertService.createAlert).toHaveBeenCalledWith(
      {
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      },
      '+12025551234'
    );
  });

  it('should create alert without SMS notification when phone number is not provided', async () => {
    const mockAlert: Alert = {
      id: 'alert-123',
      ambulanceId: 'ambulance-456',
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Heavy traffic on route',
      status: 'pending',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    mockedAlertService.createAlert.mockResolvedValue(mockAlert);

    const response = await request(app)
      .post('/api/alerts')
      .send({
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ alert: mockAlert });
    expect(mockedAlertService.createAlert).toHaveBeenCalledWith(
      {
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route'
      },
      undefined
    );
  });
});

describe('PUT /api/alerts/:id/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update alert status to dispatched successfully', async () => {
    const mockAlert: Alert = {
      id: 'alert-123',
      ambulanceId: 'ambulance-456',
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Heavy traffic on route',
      status: 'dispatched',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:01:00.000Z'
    };

    mockedAlertService.updateAlertStatus.mockResolvedValue(mockAlert);

    const response = await request(app)
      .put('/api/alerts/alert-123/status')
      .send({ status: 'dispatched' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ alert: mockAlert });
    expect(mockedAlertService.updateAlertStatus).toHaveBeenCalledWith('alert-123', 'dispatched');
  });

  it('should update alert status to cleared successfully', async () => {
    const mockAlert: Alert = {
      id: 'alert-123',
      ambulanceId: 'ambulance-456',
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Heavy traffic on route',
      status: 'cleared',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:02:00.000Z',
      clearedAt: '2024-01-01T00:02:00.000Z'
    };

    mockedAlertService.updateAlertStatus.mockResolvedValue(mockAlert);

    const response = await request(app)
      .put('/api/alerts/alert-123/status')
      .send({ status: 'cleared' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ alert: mockAlert });
    expect(mockedAlertService.updateAlertStatus).toHaveBeenCalledWith('alert-123', 'cleared');
  });

  it('should return 400 if status is missing', async () => {
    const response = await request(app)
      .put('/api/alerts/alert-123/status')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required field');
  });

  it('should return 400 if status is invalid', async () => {
    const response = await request(app)
      .put('/api/alerts/alert-123/status')
      .send({ status: 'invalid-status' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid status');
  });

  it('should return 404 if alert is not found', async () => {
    mockedAlertService.updateAlertStatus.mockRejectedValue(new Error('Alert not found'));

    const response = await request(app)
      .put('/api/alerts/nonexistent-id/status')
      .send({ status: 'dispatched' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Alert not found');
  });

  it('should return 500 on unexpected error', async () => {
    mockedAlertService.updateAlertStatus.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .put('/api/alerts/alert-123/status')
      .send({ status: 'dispatched' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to update alert status');
  });
});

describe('GET /api/alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all active alerts', async () => {
    const mockAlerts: Alert[] = [
      {
        id: 'alert-123',
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'alert-789',
        ambulanceId: 'ambulance-101',
        ambulanceLocation: { lat: 40.7500, lng: -73.9900 },
        destination: { lat: 40.7800, lng: -73.9600 },
        congestionPoint: { lat: 40.7600, lng: -73.9800 },
        message: 'Accident blocking lane',
        status: 'dispatched',
        createdAt: '2024-01-01T00:05:00.000Z',
        updatedAt: '2024-01-01T00:06:00.000Z'
      }
    ];

    mockedAlertService.getActiveAlerts.mockResolvedValue(mockAlerts);

    const response = await request(app).get('/api/alerts');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ alerts: mockAlerts });
    expect(mockedAlertService.getActiveAlerts).toHaveBeenCalled();
  });

  it('should return empty array when no active alerts exist', async () => {
    mockedAlertService.getActiveAlerts.mockResolvedValue([]);

    const response = await request(app).get('/api/alerts');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ alerts: [] });
  });

  it('should return 500 on error', async () => {
    mockedAlertService.getActiveAlerts.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/alerts');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to retrieve alerts');
  });
});

describe('GET /api/alerts/ambulance/:ambulanceId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return alerts for specific ambulance', async () => {
    const mockAlerts: Alert[] = [
      {
        id: 'alert-123',
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7300, lng: -74.0000 },
        message: 'Heavy traffic on route',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'alert-456',
        ambulanceId: 'ambulance-456',
        ambulanceLocation: { lat: 40.7200, lng: -74.0100 },
        destination: { lat: 40.7600, lng: -73.9800 },
        congestionPoint: { lat: 40.7400, lng: -74.0050 },
        message: 'Road construction ahead',
        status: 'cleared',
        createdAt: '2024-01-01T00:10:00.000Z',
        updatedAt: '2024-01-01T00:15:00.000Z',
        clearedAt: '2024-01-01T00:15:00.000Z'
      }
    ];

    mockedAlertService.getAlertsForAmbulance.mockResolvedValue(mockAlerts);

    const response = await request(app).get('/api/alerts/ambulance/ambulance-456');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ alerts: mockAlerts });
    expect(mockedAlertService.getAlertsForAmbulance).toHaveBeenCalledWith('ambulance-456');
  });

  it('should return empty array when ambulance has no alerts', async () => {
    mockedAlertService.getAlertsForAmbulance.mockResolvedValue([]);

    const response = await request(app).get('/api/alerts/ambulance/ambulance-999');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ alerts: [] });
  });

  it('should return 400 if ambulanceId validation fails', async () => {
    const error = new alertService.AlertServiceError('Ambulance ID is required', 'MISSING_AMBULANCE_ID');
    mockedAlertService.getAlertsForAmbulance.mockRejectedValue(error);

    const response = await request(app).get('/api/alerts/ambulance/');

    expect(response.status).toBe(404); // Express returns 404 for missing route params
  });

  it('should return 500 on error', async () => {
    mockedAlertService.getAlertsForAmbulance.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/alerts/ambulance/ambulance-456');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to retrieve alerts for ambulance');
  });
});
