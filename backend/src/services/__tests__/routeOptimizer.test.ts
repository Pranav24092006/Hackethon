/**
 * Route Optimizer Tests
 * 
 * Tests for A* pathfinding algorithm implementation
 */

import {
  aStarSearch,
  heuristic,
  reconstructPath,
  PriorityQueue,
} from '../routeOptimizer';
import { RoadNetwork, RoadNode, RoadEdge, Coordinates } from '../../models/RoadNetwork';

describe('PriorityQueue', () => {
  test('should enqueue and dequeue elements in priority order', () => {
    const pq = new PriorityQueue<string>();
    
    pq.enqueue('low', 10);
    pq.enqueue('high', 1);
    pq.enqueue('medium', 5);
    
    expect(pq.dequeue()).toBe('high');
    expect(pq.dequeue()).toBe('medium');
    expect(pq.dequeue()).toBe('low');
  });

  test('should check if queue is empty', () => {
    const pq = new PriorityQueue<string>();
    expect(pq.isEmpty()).toBe(true);
    
    pq.enqueue('item', 1);
    expect(pq.isEmpty()).toBe(false);
    
    pq.dequeue();
    expect(pq.isEmpty()).toBe(true);
  });

  test('should throw error when dequeuing from empty queue', () => {
    const pq = new PriorityQueue<string>();
    expect(() => pq.dequeue()).toThrow('Priority queue is empty');
  });

  test('should check if element is contained in queue', () => {
    const pq = new PriorityQueue<string>();
    pq.enqueue('item1', 1);
    pq.enqueue('item2', 2);
    
    expect(pq.contains('item1')).toBe(true);
    expect(pq.contains('item3')).toBe(false);
  });
});

describe('heuristic', () => {
  test('should calculate Euclidean distance between two nodes', () => {
    const node1: RoadNode = {
      id: 'node1',
      coordinates: { lat: 0, lng: 0 },
    };
    const node2: RoadNode = {
      id: 'node2',
      coordinates: { lat: 3, lng: 4 },
    };
    
    const distance = heuristic(node1, node2);
    expect(distance).toBeCloseTo(5, 5); // 3-4-5 triangle
  });

  test('should return zero for same node', () => {
    const node: RoadNode = {
      id: 'node1',
      coordinates: { lat: 1, lng: 1 },
    };
    
    const distance = heuristic(node, node);
    expect(distance).toBe(0);
  });

  test('should be symmetric', () => {
    const node1: RoadNode = {
      id: 'node1',
      coordinates: { lat: 1, lng: 2 },
    };
    const node2: RoadNode = {
      id: 'node2',
      coordinates: { lat: 4, lng: 6 },
    };
    
    expect(heuristic(node1, node2)).toBe(heuristic(node2, node1));
  });
});

describe('reconstructPath', () => {
  test('should reconstruct path from cameFrom map', () => {
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
      ['B', { id: 'B', coordinates: { lat: 1, lng: 0 } }],
      ['C', { id: 'C', coordinates: { lat: 2, lng: 0 } }],
    ]);

    const network: RoadNetwork = {
      nodes,
      edges: new Map(),
    };

    const cameFrom = new Map<string, string>([
      ['B', 'A'],
      ['C', 'B'],
    ]);

    const goalNode = nodes.get('C')!;
    const path = reconstructPath(cameFrom, goalNode, network);

    expect(path).toHaveLength(3);
    expect(path[0]).toEqual({ lat: 0, lng: 0 }); // A
    expect(path[1]).toEqual({ lat: 1, lng: 0 }); // B
    expect(path[2]).toEqual({ lat: 2, lng: 0 }); // C
  });

  test('should handle single node path', () => {
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
    ]);

    const network: RoadNetwork = {
      nodes,
      edges: new Map(),
    };

    const cameFrom = new Map<string, string>();
    const goalNode = nodes.get('A')!;
    const path = reconstructPath(cameFrom, goalNode, network);

    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ lat: 0, lng: 0 });
  });
});

describe('aStarSearch', () => {
  test('should find optimal path in simple linear network', () => {
    // Create a simple linear network: A -> B -> C
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
      ['B', { id: 'B', coordinates: { lat: 1, lng: 0 } }],
      ['C', { id: 'C', coordinates: { lat: 2, lng: 0 } }],
    ]);

    const edges = new Map<string, RoadEdge[]>([
      ['A', [{ from: 'A', to: 'B', distance: 1, congestionWeight: 1.0 }]],
      ['B', [{ from: 'B', to: 'C', distance: 1, congestionWeight: 1.0 }]],
    ]);

    const network: RoadNetwork = { nodes, edges };
    const start = nodes.get('A')!;
    const goal = nodes.get('C')!;

    const path = aStarSearch(start, goal, network);

    expect(path).toHaveLength(3);
    expect(path[0]).toEqual({ lat: 0, lng: 0 }); // A
    expect(path[1]).toEqual({ lat: 1, lng: 0 }); // B
    expect(path[2]).toEqual({ lat: 2, lng: 0 }); // C
  });

  test('should find path in grid network', () => {
    // Create a 3x3 grid network
    const nodes = new Map<string, RoadNode>();
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const id = `${i}_${j}`;
        nodes.set(id, { id, coordinates: { lat: i, lng: j } });
      }
    }

    const edges = new Map<string, RoadEdge[]>();
    // Add horizontal and vertical edges
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const id = `${i}_${j}`;
        const edgeList: RoadEdge[] = [];

        // Right edge
        if (j < 2) {
          edgeList.push({
            from: id,
            to: `${i}_${j + 1}`,
            distance: 1,
            congestionWeight: 1.0,
          });
        }

        // Down edge
        if (i < 2) {
          edgeList.push({
            from: id,
            to: `${i + 1}_${j}`,
            distance: 1,
            congestionWeight: 1.0,
          });
        }

        if (edgeList.length > 0) {
          edges.set(id, edgeList);
        }
      }
    }

    const network: RoadNetwork = { nodes, edges };
    const start = nodes.get('0_0')!;
    const goal = nodes.get('2_2')!;

    const path = aStarSearch(start, goal, network);

    // Path should exist and start at (0,0) and end at (2,2)
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ lat: 0, lng: 0 });
    expect(path[path.length - 1]).toEqual({ lat: 2, lng: 2 });
  });

  test('should prefer route with lower congestion', () => {
    // Create a network with two paths: one congested, one clear
    //     B (congested)
    //    / \
    //   A   D
    //    \ /
    //     C (clear)
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
      ['B', { id: 'B', coordinates: { lat: 0.5, lng: 1 } }],
      ['C', { id: 'C', coordinates: { lat: -0.5, lng: 1 } }],
      ['D', { id: 'D', coordinates: { lat: 0, lng: 2 } }],
    ]);

    const edges = new Map<string, RoadEdge[]>([
      [
        'A',
        [
          { from: 'A', to: 'B', distance: 1, congestionWeight: 3.0 }, // Red congestion
          { from: 'A', to: 'C', distance: 1, congestionWeight: 1.0 }, // Green (clear)
        ],
      ],
      ['B', [{ from: 'B', to: 'D', distance: 1, congestionWeight: 3.0 }]],
      ['C', [{ from: 'C', to: 'D', distance: 1, congestionWeight: 1.0 }]],
    ]);

    const network: RoadNetwork = { nodes, edges };
    const start = nodes.get('A')!;
    const goal = nodes.get('D')!;

    const path = aStarSearch(start, goal, network);

    // Should take the clear route through C
    expect(path).toHaveLength(3);
    expect(path[0]).toEqual({ lat: 0, lng: 0 }); // A
    expect(path[1]).toEqual({ lat: -0.5, lng: 1 }); // C
    expect(path[2]).toEqual({ lat: 0, lng: 2 }); // D
  });

  test('should incorporate congestion weights in path cost', () => {
    // Create two paths with same distance but different congestion
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
      ['B', { id: 'B', coordinates: { lat: 1, lng: 0 } }],
      ['C', { id: 'C', coordinates: { lat: 1, lng: 1 } }],
      ['D', { id: 'D', coordinates: { lat: 0, lng: 1 } }],
    ]);

    const edges = new Map<string, RoadEdge[]>([
      [
        'A',
        [
          { from: 'A', to: 'B', distance: 1, congestionWeight: 1.5 }, // Orange
          { from: 'A', to: 'D', distance: 1, congestionWeight: 1.0 }, // Green
        ],
      ],
      ['B', [{ from: 'B', to: 'C', distance: 1, congestionWeight: 1.5 }]],
      ['D', [{ from: 'D', to: 'C', distance: 1, congestionWeight: 1.0 }]],
    ]);

    const network: RoadNetwork = { nodes, edges };
    const start = nodes.get('A')!;
    const goal = nodes.get('C')!;

    const path = aStarSearch(start, goal, network);

    // Should prefer the green route (A -> D -> C) over orange route (A -> B -> C)
    expect(path[1]).toEqual({ lat: 0, lng: 1 }); // D
  });

  test('should throw error when no path exists', () => {
    // Create two disconnected nodes
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
      ['B', { id: 'B', coordinates: { lat: 10, lng: 10 } }],
    ]);

    const edges = new Map<string, RoadEdge[]>();

    const network: RoadNetwork = { nodes, edges };
    const start = nodes.get('A')!;
    const goal = nodes.get('B')!;

    expect(() => aStarSearch(start, goal, network)).toThrow('No path found');
  });

  test('should handle start node equals goal node', () => {
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
    ]);

    const edges = new Map<string, RoadEdge[]>();

    const network: RoadNetwork = { nodes, edges };
    const start = nodes.get('A')!;
    const goal = nodes.get('A')!;

    const path = aStarSearch(start, goal, network);

    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ lat: 0, lng: 0 });
  });

  test('should handle different congestion weight values', () => {
    // Test with all three congestion levels: 1.0 (green), 1.5 (orange), 3.0 (red)
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
      ['B', { id: 'B', coordinates: { lat: 1, lng: 0 } }],
    ]);

    const edges = new Map<string, RoadEdge[]>([
      ['A', [{ from: 'A', to: 'B', distance: 1, congestionWeight: 3.0 }]],
    ]);

    const network: RoadNetwork = { nodes, edges };
    const start = nodes.get('A')!;
    const goal = nodes.get('B')!;

    // Should still find path even with high congestion
    const path = aStarSearch(start, goal, network);
    expect(path).toHaveLength(2);
  });

  test('should find optimal path in complex network', () => {
    // Create a more complex network with multiple possible paths
    const nodes = new Map<string, RoadNode>([
      ['A', { id: 'A', coordinates: { lat: 0, lng: 0 } }],
      ['B', { id: 'B', coordinates: { lat: 1, lng: 0 } }],
      ['C', { id: 'C', coordinates: { lat: 2, lng: 0 } }],
      ['D', { id: 'D', coordinates: { lat: 0, lng: 1 } }],
      ['E', { id: 'E', coordinates: { lat: 1, lng: 1 } }],
      ['F', { id: 'F', coordinates: { lat: 2, lng: 1 } }],
    ]);

    const edges = new Map<string, RoadEdge[]>([
      [
        'A',
        [
          { from: 'A', to: 'B', distance: 1, congestionWeight: 1.0 },
          { from: 'A', to: 'D', distance: 1, congestionWeight: 1.0 },
        ],
      ],
      [
        'B',
        [
          { from: 'B', to: 'C', distance: 1, congestionWeight: 1.0 },
          { from: 'B', to: 'E', distance: 1, congestionWeight: 1.0 },
        ],
      ],
      ['C', [{ from: 'C', to: 'F', distance: 1, congestionWeight: 1.0 }]],
      ['D', [{ from: 'D', to: 'E', distance: 1, congestionWeight: 1.0 }]],
      ['E', [{ from: 'E', to: 'F', distance: 1, congestionWeight: 1.0 }]],
    ]);

    const network: RoadNetwork = { nodes, edges };
    const start = nodes.get('A')!;
    const goal = nodes.get('F')!;

    const path = aStarSearch(start, goal, network);

    // Should find a valid path from A to F
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ lat: 0, lng: 0 }); // A
    expect(path[path.length - 1]).toEqual({ lat: 2, lng: 1 }); // F
  });
});
