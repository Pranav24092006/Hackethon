/**
 * Road Network Service Tests
 */

import { roadNetworkService } from '../roadNetworkService';
import { OSMData, Coordinates } from '../../models/RoadNetwork';

describe('RoadNetworkService', () => {
  beforeEach(() => {
    // Clear cache before each test
    roadNetworkService.clearCache();
  });

  describe('getRoadNetwork', () => {
    it('should load and return a road network', async () => {
      const network = await roadNetworkService.getRoadNetwork();

      expect(network).toBeDefined();
      expect(network.nodes).toBeInstanceOf(Map);
      expect(network.edges).toBeInstanceOf(Map);
      expect(network.nodes.size).toBeGreaterThan(0);
      expect(network.edges.size).toBeGreaterThan(0);
    });

    it('should return cached network on subsequent calls', async () => {
      const network1 = await roadNetworkService.getRoadNetwork();
      const network2 = await roadNetworkService.getRoadNetwork();

      // Should return the same cached instance
      expect(network1).toBe(network2);
    });

    it('should reload network after cache is cleared', async () => {
      const network1 = await roadNetworkService.getRoadNetwork();
      roadNetworkService.clearCache();
      const network2 = await roadNetworkService.getRoadNetwork();

      // Should be different instances after cache clear
      expect(network1).not.toBe(network2);
    });
  });

  describe('parseOSMData', () => {
    it('should parse OSM nodes into RoadNodes', () => {
      const osmData: OSMData = {
        nodes: [
          { id: 'n1', lat: 40.7128, lon: -74.006 },
          { id: 'n2', lat: 40.7138, lon: -74.006 },
        ],
        ways: [],
      };

      const network = roadNetworkService.parseOSMData(osmData);

      expect(network.nodes.size).toBe(2);
      expect(network.nodes.get('n1')).toEqual({
        id: 'n1',
        coordinates: { lat: 40.7128, lng: -74.006 },
      });
      expect(network.nodes.get('n2')).toEqual({
        id: 'n2',
        coordinates: { lat: 40.7138, lng: -74.006 },
      });
    });

    it('should parse OSM ways into bidirectional RoadEdges', () => {
      const osmData: OSMData = {
        nodes: [
          { id: 'n1', lat: 40.7128, lon: -74.006 },
          { id: 'n2', lat: 40.7138, lon: -74.006 },
        ],
        ways: [
          {
            id: 'w1',
            nodes: ['n1', 'n2'],
            tags: { highway: 'residential' },
          },
        ],
      };

      const network = roadNetworkService.parseOSMData(osmData);

      // Should have edges in both directions
      expect(network.edges.get('n1')).toBeDefined();
      expect(network.edges.get('n2')).toBeDefined();

      const edgesFromN1 = network.edges.get('n1')!;
      expect(edgesFromN1.length).toBe(1);
      expect(edgesFromN1[0].from).toBe('n1');
      expect(edgesFromN1[0].to).toBe('n2');
      expect(edgesFromN1[0].congestionWeight).toBe(1.0);

      const edgesFromN2 = network.edges.get('n2')!;
      expect(edgesFromN2.length).toBe(1);
      expect(edgesFromN2[0].from).toBe('n2');
      expect(edgesFromN2[0].to).toBe('n1');
    });

    it('should skip ways without highway tag', () => {
      const osmData: OSMData = {
        nodes: [
          { id: 'n1', lat: 40.7128, lon: -74.006 },
          { id: 'n2', lat: 40.7138, lon: -74.006 },
        ],
        ways: [
          {
            id: 'w1',
            nodes: ['n1', 'n2'],
            tags: { building: 'yes' }, // Not a road
          },
        ],
      };

      const network = roadNetworkService.parseOSMData(osmData);

      // Should have nodes but no edges
      expect(network.nodes.size).toBe(2);
      expect(network.edges.size).toBe(0);
    });

    it('should handle multiple connected nodes in a way', () => {
      const osmData: OSMData = {
        nodes: [
          { id: 'n1', lat: 40.7128, lon: -74.006 },
          { id: 'n2', lat: 40.7138, lon: -74.006 },
          { id: 'n3', lat: 40.7148, lon: -74.006 },
        ],
        ways: [
          {
            id: 'w1',
            nodes: ['n1', 'n2', 'n3'],
            tags: { highway: 'primary' },
          },
        ],
      };

      const network = roadNetworkService.parseOSMData(osmData);

      // n1 should connect to n2
      const edgesFromN1 = network.edges.get('n1')!;
      expect(edgesFromN1.length).toBe(1);
      expect(edgesFromN1[0].to).toBe('n2');

      // n2 should connect to both n1 and n3
      const edgesFromN2 = network.edges.get('n2')!;
      expect(edgesFromN2.length).toBe(2);
      const n2Targets = edgesFromN2.map((e) => e.to).sort();
      expect(n2Targets).toEqual(['n1', 'n3']);

      // n3 should connect to n2
      const edgesFromN3 = network.edges.get('n3')!;
      expect(edgesFromN3.length).toBe(1);
      expect(edgesFromN3[0].to).toBe('n2');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const coord1: Coordinates = { lat: 40.7128, lng: -74.006 };
      const coord2: Coordinates = { lat: 40.7138, lng: -74.006 };

      const distance = roadNetworkService.calculateDistance(coord1, coord2);

      // Distance should be approximately 0.11 km (111 meters)
      expect(distance).toBeGreaterThan(0.1);
      expect(distance).toBeLessThan(0.2);
    });

    it('should return 0 for identical coordinates', () => {
      const coord: Coordinates = { lat: 40.7128, lng: -74.006 };

      const distance = roadNetworkService.calculateDistance(coord, coord);

      expect(distance).toBe(0);
    });

    it('should calculate longer distances correctly', () => {
      const coord1: Coordinates = { lat: 40.7128, lng: -74.006 }; // New York
      const coord2: Coordinates = { lat: 34.0522, lng: -118.2437 }; // Los Angeles

      const distance = roadNetworkService.calculateDistance(coord1, coord2);

      // Distance should be approximately 3935 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });
  });

  describe('updateCongestionWeight', () => {
    it('should update congestion weight for an edge', async () => {
      const network = await roadNetworkService.getRoadNetwork();

      // Get first edge
      const firstNodeId = Array.from(network.edges.keys())[0];
      const edges = network.edges.get(firstNodeId)!;
      const firstEdge = edges[0];

      // Update congestion weight
      roadNetworkService.updateCongestionWeight(
        firstEdge.from,
        firstEdge.to,
        2.5
      );

      // Verify weight was updated
      const updatedEdges = network.edges.get(firstEdge.from)!;
      const updatedEdge = updatedEdges.find((e) => e.to === firstEdge.to);
      expect(updatedEdge?.congestionWeight).toBe(2.5);
    });

    it('should not throw error for non-existent edge', async () => {
      await roadNetworkService.getRoadNetwork();

      expect(() => {
        roadNetworkService.updateCongestionWeight(
          'nonexistent1',
          'nonexistent2',
          1.5
        );
      }).not.toThrow();
    });
  });

  describe('findNearestNode', () => {
    it('should find the nearest node to given coordinates', async () => {
      await roadNetworkService.getRoadNetwork();

      const coordinates: Coordinates = { lat: 40.7128, lng: -74.006 };
      const nearestNode = roadNetworkService.findNearestNode(coordinates);

      expect(nearestNode).toBeDefined();
      expect(nearestNode?.id).toBeDefined();
      expect(nearestNode?.coordinates).toBeDefined();
    });

    it('should return null when cache is empty', () => {
      roadNetworkService.clearCache();

      const coordinates: Coordinates = { lat: 40.7128, lng: -74.006 };
      const nearestNode = roadNetworkService.findNearestNode(coordinates);

      expect(nearestNode).toBeNull();
    });

    it('should find the closest node among multiple options', async () => {
      const osmData: OSMData = {
        nodes: [
          { id: 'n1', lat: 40.7128, lon: -74.006 },
          { id: 'n2', lat: 40.8, lon: -74.1 },
          { id: 'n3', lat: 40.713, lon: -74.007 }, // Very close to target
        ],
        ways: [
          {
            id: 'w1',
            nodes: ['n1', 'n2', 'n3'],
            tags: { highway: 'residential' },
          },
        ],
      };

      roadNetworkService.clearCache();
      const network = roadNetworkService.parseOSMData(osmData);
      // Manually cache for testing
      (roadNetworkService as any).networkCache = network;
      (roadNetworkService as any).cacheTimestamp = Date.now();

      const target: Coordinates = { lat: 40.713, lng: -74.007 };
      const nearestNode = roadNetworkService.findNearestNode(target);

      expect(nearestNode?.id).toBe('n3');
    });
  });

  describe('clearCache', () => {
    it('should clear the cached network', async () => {
      await roadNetworkService.getRoadNetwork();
      roadNetworkService.clearCache();

      const nearestNode = roadNetworkService.findNearestNode({
        lat: 40.7128,
        lng: -74.006,
      });

      expect(nearestNode).toBeNull();
    });
  });

  describe('sample network generation', () => {
    it('should generate a valid sample network', async () => {
      const network = await roadNetworkService.getRoadNetwork();

      // Sample network should be a 5x5 grid (25 nodes)
      expect(network.nodes.size).toBe(25);

      // Each internal node should have 4 connections (up, down, left, right)
      // Edge nodes have fewer connections
      // Check a middle node (should have 4 connections)
      const middleNode = network.nodes.get('node_2_2');
      expect(middleNode).toBeDefined();

      const middleEdges = network.edges.get('node_2_2');
      expect(middleEdges).toBeDefined();
      expect(middleEdges!.length).toBe(4);
    });

    it('should create bidirectional edges in sample network', async () => {
      const network = await roadNetworkService.getRoadNetwork();

      // Check that edges are bidirectional
      const edgesFrom0_0 = network.edges.get('node_0_0');
      expect(edgesFrom0_0).toBeDefined();

      // node_0_0 should connect to node_0_1 and node_1_0
      const targets = edgesFrom0_0!.map((e) => e.to).sort();
      expect(targets).toContain('node_0_1');
      expect(targets).toContain('node_1_0');

      // Check reverse edges exist
      const edgesFrom0_1 = network.edges.get('node_0_1');
      expect(edgesFrom0_1!.some((e) => e.to === 'node_0_0')).toBe(true);

      const edgesFrom1_0 = network.edges.get('node_1_0');
      expect(edgesFrom1_0!.some((e) => e.to === 'node_0_0')).toBe(true);
    });
  });
});
