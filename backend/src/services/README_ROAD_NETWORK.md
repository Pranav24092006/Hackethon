# Road Network Service

## Overview

The Road Network Service provides data structures and functionality for managing road network data used in the A* pathfinding algorithm for route optimization. It handles loading road network data from OpenStreetMap format, caching for performance, and providing utilities for distance calculation and node lookup.

## Data Structures

### RoadNode
Represents an intersection or point on the road network.
```typescript
interface RoadNode {
  id: string;
  coordinates: Coordinates;
}
```

### RoadEdge
Represents a road segment connecting two nodes.
```typescript
interface RoadEdge {
  from: string;        // Source node ID
  to: string;          // Destination node ID
  distance: number;    // Distance in kilometers
  congestionWeight: number;  // Multiplier for congestion (1.0 = no congestion)
}
```

### RoadNetwork
The complete road network graph structure.
```typescript
interface RoadNetwork {
  nodes: Map<string, RoadNode>;      // All nodes indexed by ID
  edges: Map<string, RoadEdge[]>;    // Adjacency list of edges
}
```

## Features

### 1. Road Network Loading
- Parses OpenStreetMap (OSM) data format
- Converts OSM nodes and ways into graph structure
- Creates bidirectional edges for roads
- Filters for valid road types (highways, residential, etc.)

### 2. In-Memory Caching
- Caches loaded network for 1 hour (configurable TTL)
- Reduces loading overhead for repeated requests
- Provides cache invalidation via `clearCache()`

### 3. Distance Calculation
- Uses Haversine formula for accurate geographic distance
- Returns distance in kilometers
- Accounts for Earth's curvature

### 4. Nearest Node Lookup
- Finds the closest road node to any given coordinates
- Useful for snapping GPS coordinates to road network
- Linear search (can be optimized with spatial indexing)

### 5. Congestion Weight Management
- Updates congestion weights for specific edges
- Weights used in A* algorithm cost calculation
- Default weight: 1.0 (no congestion)
- Typical weights: 1.0 (green), 1.5 (orange), 3.0 (red)

## Usage Examples

### Loading the Network
```typescript
import { roadNetworkService } from './services/roadNetworkService';

const network = await roadNetworkService.getRoadNetwork();
console.log(`Loaded ${network.nodes.size} nodes`);
```

### Finding Nearest Node
```typescript
const gpsLocation = { lat: 40.7128, lng: -74.006 };
const nearestNode = roadNetworkService.findNearestNode(gpsLocation);
console.log(`Nearest node: ${nearestNode.id}`);
```

### Updating Congestion
```typescript
// Set high congestion on a road segment
roadNetworkService.updateCongestionWeight('node_1', 'node_2', 3.0);
```

### Parsing Custom OSM Data
```typescript
const osmData = {
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
```

## Sample Network

For testing and development, the service generates a sample 5x5 grid network:
- 25 nodes (intersections)
- Bidirectional edges connecting adjacent nodes
- Approximately 1km spacing between nodes
- Based in New York City coordinates

## Future Enhancements

### Planned Features
1. **OSM API Integration**: Load real road data from Overpass API
2. **File Loading**: Parse OSM XML/JSON files
3. **Spatial Indexing**: Use R-tree or quadtree for faster nearest node lookup
4. **Road Attributes**: Include speed limits, road types, one-way restrictions
5. **Persistent Storage**: Cache network in database for faster startup
6. **Incremental Updates**: Update specific regions without full reload

### OSM API Integration (Placeholder)
```typescript
// Future implementation
const network = await roadNetworkService.loadFromOSMAPI(
  minLat: 40.7,
  minLng: -74.1,
  maxLat: 40.8,
  maxLng: -74.0
);
```

### File Loading (Placeholder)
```typescript
// Future implementation
const network = await roadNetworkService.loadFromFile('./data/city-roads.osm');
```

## Performance Considerations

### Current Implementation
- **Cache TTL**: 1 hour (3600000 ms)
- **Nearest Node**: O(n) linear search
- **Distance Calculation**: O(1) per calculation
- **Memory**: Entire network stored in RAM

### Optimization Opportunities
1. Use spatial indexing (R-tree) for O(log n) nearest node lookup
2. Implement lazy loading for large networks
3. Add compression for edge storage
4. Use typed arrays for coordinate storage

## Testing

### Unit Tests
Located in `__tests__/roadNetworkService.test.ts`

Run tests:
```bash
npm test roadNetworkService.test.ts
```

### Manual Testing
Run the manual test script:
```bash
tsx src/services/__tests__/roadNetworkService.manual.test.ts
```

## Integration with Route Optimizer

The Road Network Service is designed to work with the A* Route Optimizer:

```typescript
import { roadNetworkService } from './services/roadNetworkService';
import { routeOptimizer } from './services/routeOptimizer';

const network = await roadNetworkService.getRoadNetwork();
const route = routeOptimizer.calculateRoute(
  startCoordinates,
  destinationCoordinates,
  network
);
```

## OpenStreetMap Data Format

### OSM Node
```typescript
interface OSMNode {
  id: string;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}
```

### OSM Way
```typescript
interface OSMWay {
  id: string;
  nodes: string[];  // Array of node IDs
  tags?: Record<string, string>;  // e.g., { highway: 'residential' }
}
```

### Supported Highway Types
- motorway, trunk, primary, secondary, tertiary
- residential, service, unclassified
- motorway_link, trunk_link, primary_link, secondary_link, tertiary_link

## License

This implementation is part of the Smart Emergency Route Optimizer project.
