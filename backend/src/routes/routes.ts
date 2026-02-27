/**
 * Routes API Endpoints
 * 
 * Handles route calculation and optimization requests
 * 
 * Requirements: 3.1, 3.5, 15.1
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { Router, Request, Response } from 'express';
import { routeOptimizerService } from '../services/RouteOptimizerService';
import { Coordinates } from '../models/RoadNetwork';

const router = Router();

/**
 * POST /api/routes/calculate
 * Calculate optimal route from start to destination
 * 
 * Request body:
 * {
 *   start: { lat: number, lng: number },
 *   destination: { lat: number, lng: number }
 * }
 * 
 * Response:
 * {
 *   path: Coordinates[],
 *   segments: RouteSegment[],
 *   totalDistance: number,
 *   estimatedTime: number
 * }
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { start, destination } = req.body;

    // Validate request body
    if (!start || !destination) {
      return res.status(400).json({
        error: 'Missing required fields: start and destination are required',
      });
    }

    // Calculate route
    const route = await routeOptimizerService.calculateRoute(
      start as Coordinates,
      destination as Coordinates
    );

    return res.status(200).json(route);
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('No route available')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('no nearby road found')) {
        return res.status(400).json({ error: error.message });
      }

      // Generic server error
      return res.status(500).json({
        error: 'Failed to calculate route',
        details: error.message,
      });
    }

    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

/**
 * POST /api/routes/recalculate
 * Recalculate route with updated traffic conditions
 * 
 * Request body:
 * {
 *   currentRoute: Route,
 *   clearedBlockage?: Coordinates
 * }
 * 
 * Response:
 * {
 *   path: Coordinates[],
 *   segments: RouteSegment[],
 *   totalDistance: number,
 *   estimatedTime: number
 * }
 */
router.post('/recalculate', async (req: Request, res: Response) => {
  try {
    const { currentRoute, clearedBlockage } = req.body;

    // Validate request body
    if (!currentRoute) {
      return res.status(400).json({
        error: 'Missing required field: currentRoute is required',
      });
    }

    // Recalculate route
    const route = await routeOptimizerService.recalculateRoute(
      currentRoute,
      clearedBlockage
    );

    return res.status(200).json(route);
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('No route available')) {
        return res.status(404).json({ error: error.message });
      }

      // Generic server error
      return res.status(500).json({
        error: 'Failed to recalculate route',
        details: error.message,
      });
    }

    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

export default router;
