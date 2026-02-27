# Route Optimizer Service

## Overview

The Route Optimizer Service provides high-level route calculation and optimization functionality for the Smart Emergency Route Optimizer application. It integrates the A* pathfinding algorithm with the road network service to calculate optimal routes considering traffic congestion.

## Architecture

The route optimization system consists of two main components:

1. **routeOptimizer.ts** - Low-level A* algorithm implementation
   - Implements the A* search algorithm
   - Uses priority queue for efficient node selection
   - Calculates heuristic using Euclidean distance
   - Incorporates congestion weights in path cost

2. **RouteOptimizerService.ts** - High-level service layer
   - Provides user-friendly API for route calculation
   - Integrates with road network service
   - Handles coordinate validation
   - Estimates travel time based on congestion
   - Manages route recalculation

## Usage

### Calculate Route

```typescript
import { routeOptimizerService } from './services/RouteOptimizerService';

const start = { lat: 40.7128, lng: -74.006 };
const destination = { lat: 40.7228, lng: -74.016 };

try {
  const route = await routeOptimizerService.calculateRoute(start, destination);
  
  console.log('Path:', route.path);
  console.log('Total Distance:', route.totalDistance, 'km');
  console.log('Estimated Time:', route.estimatedTime, 'minutes');
  console.log('Segments:', route.segments);
} catch (error) {
  console.error('Route calculation failed:', error.message);
}
```

### Recalculate Route

```typescript
// When traffic conditions change or blockage is cleared
const updatedRoute = await routeOptimizerService.recalculateRoute(
  currentRoute,
  clearedBlockage // optional
);
```

### Estimate Travel Time

```typescript
const estimatedTime = routeOptimizerService.estimateTravelTime(route);
console.log('Estimated travel time:', estimatedTime, 'minutes');
```

## API Endpoints

### POST /api/routes/calculate

Calculate optimal route from start to destination.

**Request:**
```json
{
  "start": { "lat": 40.7128, "lng": -74.006 },
  "destination": { "lat": 40.7228, "lng": -74.016 }
}
```

**Response:**
```json
{
  "path": [
    { "lat": 40.7128, "lng": -74.006 },
    { "lat": 40.7178, "lng": -74.011 },
    { "lat": 40.7228, "lng": -74.016 }
  ],
  "segments": [
    {
      "start": { "lat": 40.7128, "lng": -74.006 },
      "end": { "lat": 40.7178, "lng": -74.011 },
      "distance": 0.75,
      "congestionLevel": "green"
    },
    {
      "start": { "lat": 40.7178, "lng": -74.011 },
      "end": { "lat": 40.7228, "lng": -74.016 },
      "distance": 0.75,
      "congestionLevel": "orange"
    }
  ],
  "totalDistance": 1.5,
  "estimatedTime": 1.25
}
```

### POST /api/routes/recalculate

Recalculate route with updated traffic conditions.

**Request:**
```json
{
  "currentRoute": { /* Route object */ },
  "clearedBlockage": { "lat": 40.7178, "lng": -74.011 }
}
```

**Response:** Same as calculate endpoint

## Error Handling

The service handles the following error cases:

### Invalid Coordinates (400 Bad Request)
- Missing coordinates
- Non-numeric lat/lng values
- Latitude outside range [-90, 90]
- Longitude outside range [-180, 180]
- No nearby road found for coordinates

### No Route Found (404 Not Found)
- No path exists between start and destination
- Start and destination are in disconnected road networks

### Server Errors (500 Internal Server Error)
- Road network loading failure
- Unexpected algorithm errors

## Congestion Levels

The service maps congestion weights to visual levels:

| Weight Range | Level  | Color  | Speed (km/h) |
|-------------|--------|--------|--------------|
| < 1.3       | green  | Green  | 60           |
| 1.3 - 2.5   | orange | Orange | 30           |
| >= 2.5      | red    | Red    | 15           |

## Travel Time Estimation

Travel time is calculated using the formula:

```
time = distance / speed
```

Where speed is determined by the congestion level of each segment:
- Green: 60 km/h
- Orange: 30 km/h
- Red: 15 km/h

Total time is the sum of all segment times, converted to minutes.

## Requirements Satisfied

- **3.1**: Calculate optimal path using A* algorithm
- **3.3**: Factor congestion into path calculations
- **3.4**: Recalculate route dynamically when conditions change
- **3.5**: Display estimated travel time based on current conditions
- **13.5**: Return error message when no valid path exists

## Testing

The service includes comprehensive unit tests covering:
- Valid route calculation
- Invalid coordinate handling
- No path found scenarios
- Route recalculation
- Travel time estimation for all congestion levels
- Edge cases (single point, boundary coordinates)

Run tests:
```bash
npm test -- RouteOptimizerService.test.ts
```

## Future Enhancements

1. **Real-time Traffic Integration**: Connect to live traffic data sources
2. **Alternative Routes**: Calculate multiple route options
3. **Route Preferences**: Allow users to prefer highways or avoid tolls
4. **Historical Data**: Use historical traffic patterns for better estimates
5. **Multi-stop Routes**: Support routes with multiple waypoints
