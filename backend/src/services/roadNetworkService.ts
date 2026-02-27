/**
 * Road Network Service
 * 
 * Handles loading, caching, and managing road network data from OpenStreetMap.
 * Provides in-memory caching for performance optimization.
 */

import {
  RoadNetwork,
  RoadNode,
  RoadEdge,
  OSMData,
  OSMNode,
  OSMWay,
  Coordinates,
} from '../models/RoadNetwork';

class RoadNetworkService {
  private networkCache: RoadNetwork | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_TTL_MS = 3600000; // 1 hour cache TTL

  /**
   * Get the cached road network or load it if not cached
   */
  async getRoadNetwork(): Promise<RoadNetwork> {
    if (this.isCacheValid()) {
      return this.networkCache!;
    }

    // Load network from data source
    const network = await this.loadRoadNetwork();
    this.cacheNetwork(network);
    return network;
  }

  /**
   * Load road network from OpenStreetMap data
   * In a real implementation, this would fetch from OSM API or a local database
   * For now, we'll create a sample network for testing
   */
  private async loadRoadNetwork(): Promise<RoadNetwork> {
    // TODO: In production, this should load from OSM API or local OSM data file
    // For now, return a sample network
    const osmData = this.getSampleOSMData();
    return this.parseOSMData(osmData);
  }

  /**
   * Parse OpenStreetMap data into RoadNetwork format
   */
  parseOSMData(osmData: OSMData): RoadNetwork {
    const nodes = new Map<string, RoadNode>();
    const edges = new Map<string, RoadEdge[]>();

    // Convert OSM nodes to RoadNodes
    for (const osmNode of osmData.nodes) {
      nodes.set(osmNode.id, {
        id: osmNode.id,
        coordinates: {
          lat: osmNode.lat,
          lng: osmNode.lon,
        },
      });
    }

    // Convert OSM ways to RoadEdges
    for (const way of osmData.ways) {
      // Skip ways that are not roads
      if (!this.isRoadWay(way)) {
        continue;
      }

      // Create edges between consecutive nodes in the way
      for (let i = 0; i < way.nodes.length - 1; i++) {
        const fromId = way.nodes[i];
        const toId = way.nodes[i + 1];

        const fromNode = nodes.get(fromId);
        const toNode = nodes.get(toId);

        if (!fromNode || !toNode) {
          continue;
        }

        const distance = this.calculateDistance(
          fromNode.coordinates,
          toNode.coordinates
        );

        const edge: RoadEdge = {
          from: fromId,
          to: toId,
          distance,
          congestionWeight: 1.0, // Default: no congestion
        };

        // Add edge in both directions (bidirectional roads)
        if (!edges.has(fromId)) {
          edges.set(fromId, []);
        }
        edges.get(fromId)!.push(edge);

        // Add reverse edge
        const reverseEdge: RoadEdge = {
          from: toId,
          to: fromId,
          distance,
          congestionWeight: 1.0,
        };

        if (!edges.has(toId)) {
          edges.set(toId, []);
        }
        edges.get(toId)!.push(reverseEdge);
      }
    }

    return { nodes, edges };
  }

  /**
   * Check if an OSM way represents a road
   */
  private isRoadWay(way: OSMWay): boolean {
    if (!way.tags || !way.tags.highway) {
      return false;
    }

    // Include common road types
    const roadTypes = [
      'motorway',
      'trunk',
      'primary',
      'secondary',
      'tertiary',
      'residential',
      'service',
      'unclassified',
      'motorway_link',
      'trunk_link',
      'primary_link',
      'secondary_link',
      'tertiary_link',
    ];

    return roadTypes.includes(way.tags.highway);
  }

  /**
   * Calculate Euclidean distance between two coordinates
   * Returns distance in kilometers
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) *
        Math.cos(this.toRadians(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Update congestion weight for a specific edge
   */
  updateCongestionWeight(
    fromNodeId: string,
    toNodeId: string,
    weight: number
  ): void {
    if (!this.networkCache) {
      return;
    }

    const edges = this.networkCache.edges.get(fromNodeId);
    if (!edges) {
      return;
    }

    const edge = edges.find((e) => e.to === toNodeId);
    if (edge) {
      edge.congestionWeight = weight;
    }
  }

  /**
   * Find the nearest road node to given coordinates
   */
  findNearestNode(coordinates: Coordinates): RoadNode | null {
    if (!this.networkCache) {
      return null;
    }

    let nearestNode: RoadNode | null = null;
    let minDistance = Infinity;

    for (const node of this.networkCache.nodes.values()) {
      const distance = this.calculateDistance(coordinates, node.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }

    return nearestNode;
  }

  /**
   * Clear the network cache
   */
  clearCache(): void {
    this.networkCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Check if the cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.networkCache || !this.cacheTimestamp) {
      return false;
    }

    const now = Date.now();
    return now - this.cacheTimestamp < this.CACHE_TTL_MS;
  }

  /**
   * Cache the network in memory
   */
  private cacheNetwork(network: RoadNetwork): void {
    this.networkCache = network;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Get sample OSM data for testing
   * In production, this would be replaced with actual OSM data loading
   */
  private getSampleOSMData(): OSMData {
    // Create a simple grid network for testing
    // This represents a 5x5 grid of intersections
    const nodes: OSMNode[] = [];
    const ways: OSMWay[] = [];

    // Base coordinates (example: somewhere in a city)
    const baseLat = 40.7128;
    const baseLng = -74.006;
    const gridSize = 5;
    const spacing = 0.01; // Approximately 1km spacing

    // Create grid nodes
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const nodeId = `node_${i}_${j}`;
        nodes.push({
          id: nodeId,
          lat: baseLat + i * spacing,
          lon: baseLng + j * spacing,
        });
      }
    }

    // Create horizontal roads
    for (let i = 0; i < gridSize; i++) {
      const wayNodes: string[] = [];
      for (let j = 0; j < gridSize; j++) {
        wayNodes.push(`node_${i}_${j}`);
      }
      ways.push({
        id: `way_h_${i}`,
        nodes: wayNodes,
        tags: { highway: 'residential' },
      });
    }

    // Create vertical roads
    for (let j = 0; j < gridSize; j++) {
      const wayNodes: string[] = [];
      for (let i = 0; i < gridSize; i++) {
        wayNodes.push(`node_${i}_${j}`);
      }
      ways.push({
        id: `way_v_${j}`,
        nodes: wayNodes,
        tags: { highway: 'residential' },
      });
    }

    return { nodes, ways };
  }

  /**
   * Load road network from OSM XML or JSON file
   * This is a placeholder for future implementation
   */
  async loadFromFile(filePath: string): Promise<RoadNetwork> {
    // TODO: Implement file loading
    // This would parse OSM XML or JSON format
    throw new Error('File loading not yet implemented');
  }

  /**
   * Load road network from OSM API for a bounding box
   * This is a placeholder for future implementation
   */
  async loadFromOSMAPI(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number
  ): Promise<RoadNetwork> {
    // TODO: Implement OSM API integration
    // This would use the Overpass API to fetch road data
    throw new Error('OSM API loading not yet implemented');
  }
}

// Export singleton instance
export const roadNetworkService = new RoadNetworkService();
export default roadNetworkService;
