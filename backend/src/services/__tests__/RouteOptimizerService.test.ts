/**
 * Tests for RouteOptimizerService
 * 
 * Tests the high-level route optimization service including:
 * - Route calculation with A* algorithm
 * - Route recalculation for dynamic updates
 * - Travel time estimation
 * - Error handling for invalid coordinates and no path found
 */

import { RouteOptimizerService } from '../RouteOptimizerService';
import { roadNetworkService } from '../roadNetworkService';
import { aStarSearch } from '../routeOptimizer';
import { Coordinates } from '../../models/RoadNetwork';

// Mock dependencies
jest.mock('../roadNetworkService');
jest.mock('../routeOptimizer');

describe('RouteOptimizerService', () => {
  let service: RouteOptimizerService;

  beforeEach(() => {
    service = new RouteOptimizerService();
    jest.clearAllMocks();
  });

  describe('calculateRoute', () => {
    it('should calculate a valid route from start to destination', async () => {
      // Setup mock data
      const start: Coordinates = { lat: 40.7128, lng: -74.006 };
      const destination: Coordinates = { lat: 40.7228, lng: -74.016 };

      const mockNetwork = {
        nodes: new Map([
          ['node1', { id: 'node1', coordinates: start }],
          ['node2', { id: 'node2', coordinates: destination }],
        ]),
        edges: new Map([
          [
            'node1',
            [
              {
                from: 'node1',
                to: 'node2',
                distance: 1.5,
                congestionWeight: 1.0,
              },
            ],
          ],
        ]),
      };

      const mockPath = [start, destination];

      (roadNetworkService.getRoadNetwork as jest.Mock).mockResolvedValue(
        mockNetwork
      );
      (roadNetworkService.findNearestNode as jest.Mock)
        .mockReturnValueOnce(mockNetwork.nodes.get('node1'))
        .mockReturnValueOnce(mockNetwork.nodes.get('node2'));
      (roadNetworkService.calculateDistance as jest.Mock).mockReturnValue(1.5);
      (aStarSearch as jest.Mock).mockReturnValue(mockPath);

      const route = await service.calculateRoute(start, destination);

      expect(route).toBeDefined();
      expect(route.path).toEqual(mockPath);
      expect(route.segments).toHaveLength(1);
      expect(route.totalDistance).toBeGreaterThan(0);
      expect(route.estimatedTime).toBeGreaterThan(0);
    });

    it('should throw error for invalid start coordinates', async () => {
      const invalidStart: any = { lat: 100, lng: -74.006 }; // Invalid latitude
      const destination: Coordinates = { lat: 40.7228, lng: -74.016 };

      await expect(
        service.calculateRoute(invalidStart, destination)
      ).rejects.toThrow('Invalid start coordinates');
    });

    it('should throw error for invalid destination coordinates', async () => {
      const start: Coordinates = { lat: 40.7128, lng: -74.006 };
      const invalidDest: any = { lat: 40.7228, lng: 200 }; // Invalid longitude

      await expect(
        service.calculateRoute(start, invalidDest)
      ).rejects.toThrow('Invalid destination coordinates');
    });

    it('should throw error when no nearby road found for start', async () => {
      const start: Coordinates = { lat: 40.7128, lng: -74.006 };
      const destination: Coordinates = { lat: 40.7228, lng: -74.016 };

      const mockNetwork = {
        nodes: new Map(),
        edges: new Map(),
      };

      (roadNetworkService.getRoadNetwork as jest.Mock).mockResolvedValue(
        mockNetwork
      );
      (roadNetworkService.findNearestNode as jest.Mock).mockReturnValue(null);

      await expect(
        service.calculateRoute(start, destination)
      ).rejects.toThrow('Invalid start coordinates: no nearby road found');
    });

    it('should throw error when no path is found', async () => {
      const start: Coordinates = { lat: 40.7128, lng: -74.006 };
      const destination: Coordinates = { lat: 40.7228, lng: -74.016 };

      const mockNetwork = {
        nodes: new Map([
          ['node1', { id: 'node1', coordinates: start }],
          ['node2', { id: 'node2', coordinates: destination }],
        ]),
        edges: new Map(),
      };

      (roadNetworkService.getRoadNetwork as jest.Mock).mockResolvedValue(
        mockNetwork
      );
      (roadNetworkService.findNearestNode as jest.Mock)
        .mockReturnValueOnce(mockNetwork.nodes.get('node1'))
        .mockReturnValueOnce(mockNetwork.nodes.get('node2'));
      (aStarSearch as jest.Mock).mockImplementation(() => {
        throw new Error('No path found');
      });

      await expect(
        service.calculateRoute(start, destination)
      ).rejects.toThrow('No route available to destination');
    });

    it('should handle missing coordinates', async () => {
      const start: any = null;
      const destination: Coordinates = { lat: 40.7228, lng: -74.016 };

      await expect(
        service.calculateRoute(start, destination)
      ).rejects.toThrow('Invalid start coordinates: coordinates are required');
    });

    it('should handle non-numeric coordinates', async () => {
      const start: any = { lat: 'invalid', lng: -74.006 };
      const destination: Coordinates = { lat: 40.7228, lng: -74.016 };

      await expect(
        service.calculateRoute(start, destination)
      ).rejects.toThrow('Invalid start coordinates: lat and lng must be numbers');
    });
  });

  describe('recalculateRoute', () => {
    it('should recalculate route with updated traffic conditions', async () => {
      const start: Coordinates = { lat: 40.7128, lng: -74.006 };
      const destination: Coordinates = { lat: 40.7228, lng: -74.016 };

      const currentRoute = {
        path: [start, destination],
        segments: [
          {
            start,
            end: destination,
            distance: 1.5,
            congestionLevel: 'red' as const,
          },
        ],
        totalDistance: 1.5,
        estimatedTime: 10,
      };

      const mockNetwork = {
        nodes: new Map([
          ['node1', { id: 'node1', coordinates: start }],
          ['node2', { id: 'node2', coordinates: destination }],
        ]),
        edges: new Map([
          [
            'node1',
            [
              {
                from: 'node1',
                to: 'node2',
                distance: 1.5,
                congestionWeight: 1.0, // Cleared congestion
              },
            ],
          ],
        ]),
      };

      const mockPath = [start, destination];

      (roadNetworkService.getRoadNetwork as jest.Mock).mockResolvedValue(
        mockNetwork
      );
      (roadNetworkService.findNearestNode as jest.Mock)
        .mockReturnValueOnce(mockNetwork.nodes.get('node1'))
        .mockReturnValueOnce(mockNetwork.nodes.get('node2'));
      (roadNetworkService.calculateDistance as jest.Mock).mockReturnValue(1.5);
      (aStarSearch as jest.Mock).mockReturnValue(mockPath);

      const newRoute = await service.recalculateRoute(currentRoute);

      expect(newRoute).toBeDefined();
      expect(newRoute.path).toEqual(mockPath);
      expect(newRoute.estimatedTime).toBeLessThan(currentRoute.estimatedTime);
    });

    it('should recalculate route when blockage is cleared', async () => {
      const start: Coordinates = { lat: 40.7128, lng: -74.006 };
      const destination: Coordinates = { lat: 40.7228, lng: -74.016 };
      const clearedBlockage: Coordinates = { lat: 40.7178, lng: -74.011 };

      const currentRoute = {
        path: [start, destination],
        segments: [
          {
            start,
            end: destination,
            distance: 1.5,
            congestionLevel: 'red' as const,
          },
        ],
        totalDistance: 1.5,
        estimatedTime: 10,
      };

      const mockNetwork = {
        nodes: new Map([
          ['node1', { id: 'node1', coordinates: start }],
          ['node2', { id: 'node2', coordinates: destination }],
        ]),
        edges: new Map([
          [
            'node1',
            [
              {
                from: 'node1',
                to: 'node2',
                distance: 1.5,
                congestionWeight: 1.0,
              },
            ],
          ],
        ]),
      };

      const mockPath = [start, destination];

      (roadNetworkService.getRoadNetwork as jest.Mock).mockResolvedValue(
        mockNetwork
      );
      (roadNetworkService.findNearestNode as jest.Mock)
        .mockReturnValueOnce(mockNetwork.nodes.get('node1'))
        .mockReturnValueOnce(mockNetwork.nodes.get('node2'));
      (roadNetworkService.calculateDistance as jest.Mock).mockReturnValue(1.5);
      (aStarSearch as jest.Mock).mockReturnValue(mockPath);

      const newRoute = await service.recalculateRoute(
        currentRoute,
        clearedBlockage
      );

      expect(newRoute).toBeDefined();
      expect(newRoute.path).toBeDefined();
    });
  });

  describe('estimateTravelTime', () => {
    it('should estimate travel time for green (clear) traffic', () => {
      const route = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.006 },
            end: { lat: 40.7228, lng: -74.016 },
            distance: 60, // 60 km
            congestionLevel: 'green' as const,
          },
        ],
        totalDistance: 60,
        estimatedTime: 0,
      };

      const time = service.estimateTravelTime(route);

      // At 60 km/h, 60 km should take 60 minutes
      expect(time).toBe(60);
    });

    it('should estimate travel time for orange (moderate) traffic', () => {
      const route = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.006 },
            end: { lat: 40.7228, lng: -74.016 },
            distance: 30, // 30 km
            congestionLevel: 'orange' as const,
          },
        ],
        totalDistance: 30,
        estimatedTime: 0,
      };

      const time = service.estimateTravelTime(route);

      // At 30 km/h, 30 km should take 60 minutes
      expect(time).toBe(60);
    });

    it('should estimate travel time for red (congested) traffic', () => {
      const route = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.006 },
            end: { lat: 40.7228, lng: -74.016 },
            distance: 15, // 15 km
            congestionLevel: 'red' as const,
          },
        ],
        totalDistance: 15,
        estimatedTime: 0,
      };

      const time = service.estimateTravelTime(route);

      // At 15 km/h, 15 km should take 60 minutes
      expect(time).toBe(60);
    });

    it('should estimate travel time for mixed traffic conditions', () => {
      const route = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7178, lng: -74.011 },
          { lat: 40.7228, lng: -74.016 },
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.006 },
            end: { lat: 40.7178, lng: -74.011 },
            distance: 30, // 30 km
            congestionLevel: 'green' as const,
          },
          {
            start: { lat: 40.7178, lng: -74.011 },
            end: { lat: 40.7228, lng: -74.016 },
            distance: 15, // 15 km
            congestionLevel: 'red' as const,
          },
        ],
        totalDistance: 45,
        estimatedTime: 0,
      };

      const time = service.estimateTravelTime(route);

      // 30 km at 60 km/h = 30 minutes
      // 15 km at 15 km/h = 60 minutes
      // Total = 90 minutes
      expect(time).toBe(90);
    });

    it('should handle empty segments', () => {
      const route = {
        path: [],
        segments: [],
        totalDistance: 0,
        estimatedTime: 0,
      };

      const time = service.estimateTravelTime(route);

      expect(time).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle route with single point', async () => {
      const point: Coordinates = { lat: 40.7128, lng: -74.006 };

      const mockNetwork = {
        nodes: new Map([['node1', { id: 'node1', coordinates: point }]]),
        edges: new Map(),
      };

      const mockPath = [point];

      (roadNetworkService.getRoadNetwork as jest.Mock).mockResolvedValue(
        mockNetwork
      );
      (roadNetworkService.findNearestNode as jest.Mock).mockReturnValue(
        mockNetwork.nodes.get('node1')
      );
      (aStarSearch as jest.Mock).mockReturnValue(mockPath);

      const route = await service.calculateRoute(point, point);

      expect(route.path).toEqual([point]);
      expect(route.segments).toHaveLength(0);
      expect(route.totalDistance).toBe(0);
      expect(route.estimatedTime).toBe(0);
    });

    it('should handle coordinates at boundaries', async () => {
      const start: Coordinates = { lat: -90, lng: -180 };
      const destination: Coordinates = { lat: 90, lng: 180 };

      const mockNetwork = {
        nodes: new Map([
          ['node1', { id: 'node1', coordinates: start }],
          ['node2', { id: 'node2', coordinates: destination }],
        ]),
        edges: new Map([
          [
            'node1',
            [
              {
                from: 'node1',
                to: 'node2',
                distance: 1000,
                congestionWeight: 1.0,
              },
            ],
          ],
        ]),
      };

      const mockPath = [start, destination];

      (roadNetworkService.getRoadNetwork as jest.Mock).mockResolvedValue(
        mockNetwork
      );
      (roadNetworkService.findNearestNode as jest.Mock)
        .mockReturnValueOnce(mockNetwork.nodes.get('node1'))
        .mockReturnValueOnce(mockNetwork.nodes.get('node2'));
      (roadNetworkService.calculateDistance as jest.Mock).mockReturnValue(1000);
      (aStarSearch as jest.Mock).mockReturnValue(mockPath);

      const route = await service.calculateRoute(start, destination);

      expect(route).toBeDefined();
      expect(route.path).toEqual(mockPath);
    });
  });
});
