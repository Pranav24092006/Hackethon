/**
 * Route Optimizer Service
 * 
 * High-level service that uses A* algorithm and integrates with road network service
 * to calculate optimal routes with traffic-aware cost function.
 * 
 * Requirements: 3.1, 3.3, 3.4, 3.5, 13.5
 */

import { aStarSearch } from './routeOptimizer';
import { roadNetworkService } from './roadNetworkService';
import { Coordinates, RoadNode } from '../models/RoadNetwork';
import { retry } from '../utils/retry';
import { createLogger } from './logger';

const logger = createLogger('RouteOptimizerService');

export interface RouteSegment {
  start: Coordinates;
  end: Coordinates;
  distance: number;
  congestionLevel: 'green' | 'orange' | 'red';
}

export interface Route {
  path: Coordinates[];
  segments: RouteSegment[];
  totalDistance: number;
  estimatedTime: number;
}

export class RouteOptimizerService {
  // Average speed in km/h for different congestion levels
  private readonly SPEED_GREEN = 60; // km/h
  private readonly SPEED_ORANGE = 30; // km/h
  private readonly SPEED_RED = 15; // km/h

  /**
   * Calculate optimal route from start to destination
   * 
   * @param start - Starting coordinates
   * @param destination - Destination coordinates
   * @returns Route with path, segments, distance, and estimated time
   * @throws Error if coordinates are invalid or no path is found
   */
  async calculateRoute(
    start: Coordinates,
    destination: Coordinates
  ): Promise<Route> {
    // Validate coordinates
    this.validateCoordinates(start, 'start');
    this.validateCoordinates(destination, 'destination');

    // Use retry logic for network operations
    return retry(
      async () => {
        // Get road network
        const network = await roadNetworkService.getRoadNetwork();

        if (!network || !network.nodes || network.nodes.size === 0) {
          logger.error('Road network data unavailable');
          throw new Error('Road network data unavailable');
        }

        // Find nearest nodes to start and destination
        const startNode = roadNetworkService.findNearestNode(start);
        const destNode = roadNetworkService.findNearestNode(destination);

        if (!startNode) {
          logger.warn('Invalid start coordinates', { start });
          throw new Error('Invalid start coordinates: no nearby road found');
        }

        if (!destNode) {
          logger.warn('Invalid destination coordinates', { destination });
          throw new Error('Invalid destination coordinates: no nearby road found');
        }

        // Run A* algorithm
        let path: Coordinates[];
        try {
          path = aStarSearch(startNode, destNode, network);
        } catch (error) {
          if (error instanceof Error && error.message === 'No path found') {
            logger.warn('No route found', { start, destination });
            throw new Error('No route available to destination');
          }
          throw error;
        }

        // Build route segments with congestion data
        const segments = this.buildRouteSegments(path, network);

        // Calculate total distance
        const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);

    // Estimate travel time
    const estimatedTime = this.estimateTravelTime({ 
      path, 
      segments, 
      totalDistance, 
      estimatedTime: 0 
    });

    return {
      path,
      segments,
      totalDistance,
      estimatedTime,
    };
  }

  /**
   * Recalculate route when traffic conditions change
   * 
   * @param currentRoute - The current active route
   * @param clearedBlockage - Coordinates of the cleared blockage (optional, for future use)
   * @returns Updated route with new path and estimated time
   */
  async recalculateRoute(
    currentRoute: Route,
    _clearedBlockage?: Coordinates
  ): Promise<Route> {
    // For recalculation, we use the first and last points of the current path
    const start = currentRoute.path[0];
    const destination = currentRoute.path[currentRoute.path.length - 1];

    // Calculate new route with updated congestion data
    // Note: clearedBlockage parameter is reserved for future enhancement
    // where specific blockage locations could influence route recalculation
    return this.calculateRoute(start, destination);
  }

  /**
   * Estimate travel time based on route distance and congestion
   * 
   * @param route - Route with segments containing congestion levels
   * @returns Estimated travel time in minutes
   */
  estimateTravelTime(route: Route): number {
    let totalTimeHours = 0;

    for (const segment of route.segments) {
      let speed: number;

      // Determine speed based on congestion level
      switch (segment.congestionLevel) {
        case 'green':
          speed = this.SPEED_GREEN;
          break;
        case 'orange':
          speed = this.SPEED_ORANGE;
          break;
        case 'red':
          speed = this.SPEED_RED;
          break;
        default:
          speed = this.SPEED_GREEN;
      }

      // Time = Distance / Speed
      totalTimeHours += segment.distance / speed;
    }

    // Convert hours to minutes
    return totalTimeHours * 60;
  }

  /**
   * Validate coordinates
   * 
   * @param coords - Coordinates to validate
   * @param label - Label for error messages (e.g., 'start', 'destination')
   * @throws Error if coordinates are invalid
   */
  private validateCoordinates(coords: Coordinates, label: string): void {
    if (!coords) {
      throw new Error(`Invalid ${label} coordinates: coordinates are required`);
    }

    if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      throw new Error(`Invalid ${label} coordinates: lat and lng must be numbers`);
    }

    if (coords.lat < -90 || coords.lat > 90) {
      throw new Error(`Invalid ${label} coordinates: latitude must be between -90 and 90`);
    }

    if (coords.lng < -180 || coords.lng > 180) {
      throw new Error(`Invalid ${label} coordinates: longitude must be between -180 and 180`);
    }
  }

  /**
   * Build route segments from path coordinates
   * 
   * @param path - Array of coordinates representing the path
   * @param network - Road network with congestion data
   * @returns Array of route segments with congestion levels
   */
  private buildRouteSegments(
    path: Coordinates[],
    network: any
  ): RouteSegment[] {
    const segments: RouteSegment[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];

      // Calculate distance between consecutive points
      const distance = roadNetworkService.calculateDistance(start, end);

      // Find the edge to get congestion weight
      const startNode = this.findNodeByCoordinates(start, network);
      const endNode = this.findNodeByCoordinates(end, network);

      let congestionWeight = 1.0;
      if (startNode && endNode) {
        const edges = network.edges.get(startNode.id);
        if (edges) {
          const edge = edges.find((e: any) => e.to === endNode.id);
          if (edge) {
            congestionWeight = edge.congestionWeight;
          }
        }
      }

      // Map congestion weight to congestion level
      const congestionLevel = this.getCongestionLevel(congestionWeight);

      segments.push({
        start,
        end,
        distance,
        congestionLevel,
      });
    }

    return segments;
  }

  /**
   * Find a node by its coordinates
   * 
   * @param coords - Coordinates to search for
   * @param network - Road network
   * @returns Road node if found, null otherwise
   */
  private findNodeByCoordinates(
    coords: Coordinates,
    network: any
  ): RoadNode | null {
    for (const node of network.nodes.values()) {
      if (
        Math.abs(node.coordinates.lat - coords.lat) < 0.0001 &&
        Math.abs(node.coordinates.lng - coords.lng) < 0.0001
      ) {
        return node;
      }
    }
    return null;
  }

  /**
   * Map congestion weight to congestion level
   * 
   * @param weight - Congestion weight (1.0 = green, 1.5 = orange, 3.0 = red)
   * @returns Congestion level
   */
  private getCongestionLevel(weight: number): 'green' | 'orange' | 'red' {
    if (weight >= 2.5) {
      return 'red';
    } else if (weight >= 1.3) {
      return 'orange';
    } else {
      return 'green';
    }
  }
}

// Export singleton instance
export const routeOptimizerService = new RouteOptimizerService();
export default routeOptimizerService;
