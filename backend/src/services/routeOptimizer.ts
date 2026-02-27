/**
 * Route Optimizer Service
 * 
 * Implements A* pathfinding algorithm for calculating optimal routes
 * with traffic-aware cost function incorporating congestion weights.
 * 
 * Requirements: 13.1, 13.3, 13.4
 */

import { RoadNetwork, RoadNode, Coordinates } from '../models/RoadNetwork';

/**
 * Priority Queue implementation for A* algorithm
 * Uses a min-heap to efficiently retrieve the node with lowest f-score
 */
class PriorityQueue<T> {
  private items: Array<{ element: T; priority: number }> = [];

  enqueue(element: T, priority: number): void {
    const item = { element, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (item.priority < this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(item);
    }
  }

  dequeue(): T {
    if (this.isEmpty()) {
      throw new Error('Priority queue is empty');
    }
    return this.items.shift()!.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  contains(element: T): boolean {
    return this.items.some((item) => item.element === element);
  }
}

/**
 * Calculate Euclidean distance heuristic between two nodes
 * This is used as the heuristic function h(n) in A* algorithm
 * 
 * @param node - Current node
 * @param goal - Goal node
 * @returns Euclidean distance between the nodes
 */
function heuristic(node: RoadNode, goal: RoadNode): number {
  const dx = node.coordinates.lat - goal.coordinates.lat;
  const dy = node.coordinates.lng - goal.coordinates.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Reconstruct the path from start to goal using the cameFrom map
 * 
 * @param cameFrom - Map of node IDs to their predecessor node IDs
 * @param current - The goal node
 * @param network - The road network
 * @returns Array of coordinates representing the path
 */
function reconstructPath(
  cameFrom: Map<string, string>,
  current: RoadNode,
  network: RoadNetwork
): Coordinates[] {
  const path: Coordinates[] = [current.coordinates];
  let currentId = current.id;

  while (cameFrom.has(currentId)) {
    currentId = cameFrom.get(currentId)!;
    const node = network.nodes.get(currentId);
    if (node) {
      path.unshift(node.coordinates);
    }
  }

  return path;
}

/**
 * A* search algorithm implementation
 * Finds the optimal path from start to goal considering congestion weights
 * 
 * @param start - Starting road node
 * @param goal - Goal road node
 * @param network - The road network with nodes and edges
 * @returns Array of coordinates representing the optimal path
 * @throws Error if no path is found
 */
export function aStarSearch(
  start: RoadNode,
  goal: RoadNode,
  network: RoadNetwork
): Coordinates[] {
  const openSet = new PriorityQueue<RoadNode>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  // Initialize scores for the start node
  gScore.set(start.id, 0);
  fScore.set(start.id, heuristic(start, goal));
  openSet.enqueue(start, fScore.get(start.id)!);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();

    // Check if we've reached the goal
    if (current.id === goal.id) {
      return reconstructPath(cameFrom, current, network);
    }

    // Get all neighbors of the current node
    const neighbors = network.edges.get(current.id) || [];

    for (const edge of neighbors) {
      const neighbor = network.nodes.get(edge.to);
      if (!neighbor) {
        continue;
      }

      // Calculate tentative g-score
      // Incorporates congestion weight: 1.0 (green), 1.5 (orange), 3.0 (red)
      const tentativeGScore =
        (gScore.get(current.id) || Infinity) +
        edge.distance * edge.congestionWeight;

      // If this path to neighbor is better than any previous one
      if (tentativeGScore < (gScore.get(neighbor.id) || Infinity)) {
        // Record this path
        cameFrom.set(neighbor.id, current.id);
        gScore.set(neighbor.id, tentativeGScore);
        fScore.set(neighbor.id, tentativeGScore + heuristic(neighbor, goal));

        // Add neighbor to open set if not already present
        if (!openSet.contains(neighbor)) {
          openSet.enqueue(neighbor, fScore.get(neighbor.id)!);
        }
      }
    }
  }

  // No path found
  throw new Error('No path found');
}

export { heuristic, reconstructPath, PriorityQueue };
