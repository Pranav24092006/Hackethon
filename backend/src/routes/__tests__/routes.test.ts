/**
 * Tests for Routes API Endpoints
 */

import request from 'supertest';
import express, { Express } from 'express';
import routesRouter from '../routes';
import { routeOptimizerService } from '../../services/RouteOptimizerService';

// Mock the route optimizer service
jest.mock('../../services/RouteOptimizerService');

describe('Routes API', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/routes', routesRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/routes/calculate', () => {
    it('should calculate route successfully', async () => {
      const mockRoute = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.006 },
            end: { lat: 40.7228, lng: -74.016 },
            distance: 1.5,
            congestionLevel: 'green' as const,
          },
        ],
        totalDistance: 1.5,
        estimatedTime: 1.5,
      };

      (routeOptimizerService.calculateRoute as jest.Mock).mockResolvedValue(
        mockRoute
      );

      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          start: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7228, lng: -74.016 },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRoute);
      expect(routeOptimizerService.calculateRoute).toHaveBeenCalledWith(
        { lat: 40.7128, lng: -74.006 },
        { lat: 40.7228, lng: -74.016 }
      );
    });

    it('should return 400 for missing start coordinates', async () => {
      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          destination: { lat: 40.7228, lng: -74.016 },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for missing destination coordinates', async () => {
      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          start: { lat: 40.7128, lng: -74.006 },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid coordinates', async () => {
      (routeOptimizerService.calculateRoute as jest.Mock).mockRejectedValue(
        new Error('Invalid start coordinates: latitude must be between -90 and 90')
      );

      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          start: { lat: 100, lng: -74.006 },
          destination: { lat: 40.7228, lng: -74.016 },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    it('should return 404 when no route is found', async () => {
      (routeOptimizerService.calculateRoute as jest.Mock).mockRejectedValue(
        new Error('No route available to destination')
      );

      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          start: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7228, lng: -74.016 },
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No route available to destination');
    });

    it('should return 400 when no nearby road is found', async () => {
      (routeOptimizerService.calculateRoute as jest.Mock).mockRejectedValue(
        new Error('Invalid start coordinates: no nearby road found')
      );

      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          start: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7228, lng: -74.016 },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('no nearby road found');
    });

    it('should return 500 for unexpected errors', async () => {
      (routeOptimizerService.calculateRoute as jest.Mock).mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          start: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7228, lng: -74.016 },
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to calculate route');
    });
  });

  describe('POST /api/routes/recalculate', () => {
    it('should recalculate route successfully', async () => {
      const currentRoute = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.006 },
            end: { lat: 40.7228, lng: -74.016 },
            distance: 1.5,
            congestionLevel: 'red' as const,
          },
        ],
        totalDistance: 1.5,
        estimatedTime: 6,
      };

      const mockNewRoute = {
        ...currentRoute,
        segments: [
          {
            start: { lat: 40.7128, lng: -74.006 },
            end: { lat: 40.7228, lng: -74.016 },
            distance: 1.5,
            congestionLevel: 'green' as const,
          },
        ],
        estimatedTime: 1.5,
      };

      (routeOptimizerService.recalculateRoute as jest.Mock).mockResolvedValue(
        mockNewRoute
      );

      const response = await request(app)
        .post('/api/routes/recalculate')
        .send({
          currentRoute,
          clearedBlockage: { lat: 40.7178, lng: -74.011 },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNewRoute);
      expect(routeOptimizerService.recalculateRoute).toHaveBeenCalledWith(
        currentRoute,
        { lat: 40.7178, lng: -74.011 }
      );
    });

    it('should return 400 for missing currentRoute', async () => {
      const response = await request(app)
        .post('/api/routes/recalculate')
        .send({
          clearedBlockage: { lat: 40.7178, lng: -74.011 },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required field');
    });

    it('should recalculate without clearedBlockage parameter', async () => {
      const currentRoute = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.006 },
            end: { lat: 40.7228, lng: -74.016 },
            distance: 1.5,
            congestionLevel: 'orange' as const,
          },
        ],
        totalDistance: 1.5,
        estimatedTime: 3,
      };

      const mockNewRoute = {
        ...currentRoute,
        estimatedTime: 1.5,
      };

      (routeOptimizerService.recalculateRoute as jest.Mock).mockResolvedValue(
        mockNewRoute
      );

      const response = await request(app)
        .post('/api/routes/recalculate')
        .send({ currentRoute });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNewRoute);
    });

    it('should return 404 when no route is found during recalculation', async () => {
      const currentRoute = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [],
        totalDistance: 1.5,
        estimatedTime: 3,
      };

      (routeOptimizerService.recalculateRoute as jest.Mock).mockRejectedValue(
        new Error('No route available to destination')
      );

      const response = await request(app)
        .post('/api/routes/recalculate')
        .send({ currentRoute });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No route available to destination');
    });

    it('should return 500 for unexpected errors during recalculation', async () => {
      const currentRoute = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [],
        totalDistance: 1.5,
        estimatedTime: 3,
      };

      (routeOptimizerService.recalculateRoute as jest.Mock).mockRejectedValue(
        new Error('Network timeout')
      );

      const response = await request(app)
        .post('/api/routes/recalculate')
        .send({ currentRoute });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to recalculate route');
    });
  });
});
