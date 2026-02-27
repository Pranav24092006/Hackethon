/**
 * Road Network Data Structures
 * 
 * Defines the interfaces and types for representing road networks
 * used in the A* pathfinding algorithm for route optimization.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RoadNode {
  id: string;
  coordinates: Coordinates;
}

export interface RoadEdge {
  from: string;
  to: string;
  distance: number;
  congestionWeight: number;
}

export interface RoadNetwork {
  nodes: Map<string, RoadNode>;
  edges: Map<string, RoadEdge[]>;
}

/**
 * OpenStreetMap data structure for importing road network data
 */
export interface OSMNode {
  id: string;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OSMWay {
  id: string;
  nodes: string[];
  tags?: Record<string, string>;
}

export interface OSMData {
  nodes: OSMNode[];
  ways: OSMWay[];
}
