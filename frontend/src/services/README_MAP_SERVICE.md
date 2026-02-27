# MapService Documentation

## Overview

The MapService provides a comprehensive interface for rendering and interacting with maps using Leaflet.js and OpenStreetMap tiles. It handles map initialization, marker management, route visualization, and congestion-based color coding.

## Requirements

Validates Requirements:
- **2.1**: Display interactive map using OpenStreetMap and Leaflet.js
- **2.2**: Display ambulance's current location with a marker
- **2.5**: Support zoom and pan interactions

## Features

### Map Initialization
- Creates Leaflet map instances with OpenStreetMap tiles
- Configurable center coordinates and zoom levels
- Default zoom level of 13 for city view
- Attribution to OpenStreetMap contributors

### Marker Management
- Custom icons for different entity types:
  - 🚑 **Ambulance**: Red circular marker
  - 🚓 **Police**: Blue circular marker
  - 🏥 **Hospital**: Green circular marker
  - ⚠️ **Congestion**: Orange warning marker
- Add markers at specific coordinates
- Update marker positions in real-time
- Remove markers from the map

### Location Tracking (NEW)
- Real-time GPS coordinate tracking
- Support for both real and simulated GPS data
- Smooth marker transitions with animation
- Automatic validation of GPS coordinates
- Distance calculation between coordinates
- Significant location change detection
- Map centering on tracked locations

### Route Visualization
- Draw routes as polylines on the map
- Color-code route segments based on congestion levels:
  - **Green** (#10b981): Clear traffic
  - **Orange** (#f59e0b): Moderate congestion
  - **Red** (#ef4444): Heavy congestion
- Clear all routes from the map
- Fit map bounds to show all relevant coordinates

## API Reference

### Types

```typescript
interface Coordinates {
  lat: number;
  lng: number;
}

interface RouteSegment {
  start: Coordinates;
  end: Coordinates;
  congestionLevel: 'green' | 'orange' | 'red';
}

interface LocationTracker {
  marker: L.Marker;
  lastUpdate: Date;
  isTracking: boolean;
}

type MarkerIcon = 'ambulance' | 'police' | 'hospital' | 'congestion';
```

### Functions

#### `initializeMap(containerId: string, center: Coordinates, zoom?: number): L.Map`

Initialize a Leaflet map with OpenStreetMap tiles.

**Parameters:**
- `containerId`: HTML element ID where the map will be rendered
- `center`: Initial center coordinates for the map
- `zoom`: Initial zoom level (default: 13)

**Returns:** Leaflet Map instance

**Example:**
```typescript
const map = initializeMap('map-container', { lat: 40.7128, lng: -74.006 }, 13);
```

#### `addMarker(map: L.Map, coordinates: Coordinates, icon: MarkerIcon): L.Marker`

Add a marker to the map with a custom icon.

**Parameters:**
- `map`: Leaflet Map instance
- `coordinates`: Position for the marker
- `icon`: Type of marker icon ('ambulance', 'police', 'hospital', 'congestion')

**Returns:** Leaflet Marker instance

**Example:**
```typescript
const ambulanceMarker = addMarker(map, { lat: 40.7128, lng: -74.006 }, 'ambulance');
```

#### `updateMarker(marker: L.Marker, coordinates: Coordinates): void`

Update an existing marker's position.

**Parameters:**
- `marker`: Leaflet Marker instance to update
- `coordinates`: New position for the marker

**Example:**
```typescript
updateMarker(ambulanceMarker, { lat: 40.7589, lng: -73.9851 });
```

#### `drawRoute(map: L.Map, path: Coordinates[], color?: string): L.Polyline`

Draw a route polyline on the map.

**Parameters:**
- `map`: Leaflet Map instance
- `path`: Array of coordinates representing the route
- `color`: Color for the route line (default: '#3b82f6' - blue)

**Returns:** Leaflet Polyline instance

**Example:**
```typescript
const route = drawRoute(map, [
  { lat: 40.7128, lng: -74.006 },
  { lat: 40.7589, lng: -73.9851 },
  { lat: 40.7614, lng: -73.9776 }
]);
```

#### `colorCodeRoute(map: L.Map, segments: RouteSegment[]): L.Polyline[]`

Draw route segments with colors based on congestion levels.

**Parameters:**
- `map`: Leaflet Map instance
- `segments`: Array of route segments with congestion levels

**Returns:** Array of Leaflet Polyline instances

**Example:**
```typescript
const segments = [
  {
    start: { lat: 40.7128, lng: -74.006 },
    end: { lat: 40.7589, lng: -73.9851 },
    congestionLevel: 'green'
  },
  {
    start: { lat: 40.7589, lng: -73.9851 },
    end: { lat: 40.7614, lng: -73.9776 },
    congestionLevel: 'red'
  }
];

const polylines = colorCodeRoute(map, segments);
```

#### `clearRoutes(map: L.Map): void`

Remove all polyline routes from the map.

**Parameters:**
- `map`: Leaflet Map instance

**Example:**
```typescript
clearRoutes(map);
```

#### `removeMarker(map: L.Map, marker: L.Marker): void`

Remove a specific marker from the map.

**Parameters:**
- `map`: Leaflet Map instance
- `marker`: Marker to remove

**Example:**
```typescript
removeMarker(map, ambulanceMarker);
```

#### `fitBounds(map: L.Map, coordinates: Coordinates[]): void`

Fit map bounds to show all specified coordinates.

**Parameters:**
- `map`: Leaflet Map instance
- `coordinates`: Array of coordinates to fit in view

**Example:**
```typescript
fitBounds(map, [
  { lat: 40.7128, lng: -74.006 },
  { lat: 40.7589, lng: -73.9851 },
  { lat: 40.7614, lng: -73.9776 }
]);
```

### Location Tracking Functions

#### `startLocationTracking(map: L.Map, initialCoordinates: Coordinates, icon?: MarkerIcon): LocationTracker`

Start tracking a location with real-time updates.

**Parameters:**
- `map`: Leaflet Map instance
- `initialCoordinates`: Starting position
- `icon`: Marker icon type (default: 'ambulance')

**Returns:** LocationTracker object

**Example:**
```typescript
const tracker = startLocationTracking(map, { lat: 40.7128, lng: -74.006 }, 'ambulance');
```

#### `updateTrackedLocation(tracker: LocationTracker, coordinates: Coordinates, smoothTransition?: boolean): void`

Update tracked location with new GPS coordinates.

**Parameters:**
- `tracker`: LocationTracker object
- `coordinates`: New GPS coordinates
- `smoothTransition`: Whether to animate the marker movement (default: true)

**Example:**
```typescript
updateTrackedLocation(tracker, { lat: 40.7589, lng: -73.9851 }, true);
```

#### `stopLocationTracking(map: L.Map, tracker: LocationTracker, removeMarker?: boolean): void`

Stop tracking a location and optionally remove the marker.

**Parameters:**
- `map`: Leaflet Map instance
- `tracker`: LocationTracker object
- `removeMarker`: Whether to remove the marker from the map (default: false)

**Example:**
```typescript
stopLocationTracking(map, tracker, true);
```

#### `handleGPSCoordinates(coordinates: Coordinates): Coordinates | null`

Validate and process GPS coordinates (supports both real and simulated GPS).

**Parameters:**
- `coordinates`: GPS coordinates to validate

**Returns:** Validated coordinates or null if invalid

**Example:**
```typescript
const validated = handleGPSCoordinates({ lat: 40.7128, lng: -74.006 });
if (validated) {
  updateTrackedLocation(tracker, validated);
}
```

#### `calculateDistance(coord1: Coordinates, coord2: Coordinates): number`

Calculate distance between two coordinates using the Haversine formula.

**Parameters:**
- `coord1`: First coordinate
- `coord2`: Second coordinate

**Returns:** Distance in meters

**Example:**
```typescript
const distance = calculateDistance(
  { lat: 40.7128, lng: -74.006 },
  { lat: 40.7589, lng: -73.9851 }
);
console.log(`Distance: ${distance} meters`);
```

#### `isSignificantLocationChange(oldCoord: Coordinates, newCoord: Coordinates, threshold?: number): boolean`

Check if location update is significant enough to process. Helps reduce unnecessary updates for minor GPS fluctuations.

**Parameters:**
- `oldCoord`: Previous coordinates
- `newCoord`: New coordinates
- `threshold`: Minimum distance in meters to consider significant (default: 10m)

**Returns:** True if update is significant

**Example:**
```typescript
if (isSignificantLocationChange(lastPosition, newPosition, 10)) {
  updateTrackedLocation(tracker, newPosition);
}
```

#### `centerMapOnLocation(map: L.Map, coordinates: Coordinates, zoom?: number): void`

Center map on a specific location with optional zoom.

**Parameters:**
- `map`: Leaflet Map instance
- `coordinates`: Coordinates to center on
- `zoom`: Optional zoom level

**Example:**
```typescript
// Pan to location without changing zoom
centerMapOnLocation(map, { lat: 40.7128, lng: -74.006 });

// Set view with specific zoom
centerMapOnLocation(map, { lat: 40.7128, lng: -74.006 }, 15);
```

## Usage Example

### Basic Map with Location Tracking

```typescript
import {
  initializeMap,
  addMarker,
  startLocationTracking,
  updateTrackedLocation,
  handleGPSCoordinates,
  isSignificantLocationChange,
  colorCodeRoute,
  fitBounds
} from './services/mapService';

// Initialize map
const map = initializeMap('map-container', { lat: 40.7128, lng: -74.006 });

// Start tracking ambulance location
const tracker = startLocationTracking(
  map,
  { lat: 40.7128, lng: -74.006 },
  'ambulance'
);

// Add hospital marker
const hospitalMarker = addMarker(
  map,
  { lat: 40.7614, lng: -73.9776 },
  'hospital'
);

// Handle GPS updates (real or simulated)
function onGPSUpdate(rawCoordinates) {
  // Validate coordinates
  const validated = handleGPSCoordinates(rawCoordinates);
  if (!validated) {
    console.error('Invalid GPS coordinates');
    return;
  }

  // Check if change is significant
  const currentPos = tracker.marker.getLatLng();
  const oldCoord = { lat: currentPos.lat, lng: currentPos.lng };
  
  if (isSignificantLocationChange(oldCoord, validated, 10)) {
    // Update tracker with smooth transition
    updateTrackedLocation(tracker, validated, true);
  }
}

// Simulate GPS updates every 2 seconds
setInterval(() => {
  const newPosition = getAmbulanceGPS(); // Your GPS function
  onGPSUpdate(newPosition);
}, 2000);

// Draw color-coded route
const segments = [
  {
    start: { lat: 40.7128, lng: -74.006 },
    end: { lat: 40.7589, lng: -73.9851 },
    congestionLevel: 'green' as const
  },
  {
    start: { lat: 40.7589, lng: -73.9851 },
    end: { lat: 40.7614, lng: -73.9776 },
    congestionLevel: 'red' as const
  }
];

colorCodeRoute(map, segments);

// Fit bounds to show all markers
fitBounds(map, [
  { lat: 40.7128, lng: -74.006 },
  { lat: 40.7614, lng: -73.9776 }
]);
```

## Integration with React Components

### With Location Tracking

```typescript
import { useEffect, useRef, useState } from 'react';
import {
  initializeMap,
  startLocationTracking,
  updateTrackedLocation,
  handleGPSCoordinates,
  isSignificantLocationChange,
  stopLocationTracking
} from './services/mapService';
import type { Coordinates, LocationTracker } from './services/mapService';
import L from 'leaflet';

function AmbulanceMapComponent() {
  const mapRef = useRef<L.Map | null>(null);
  const trackerRef = useRef<LocationTracker | null>(null);
  const [ambulancePosition, setAmbulancePosition] = useState<Coordinates>({
    lat: 40.7128,
    lng: -74.006
  });

  useEffect(() => {
    // Initialize map and start tracking on mount
    if (!mapRef.current) {
      mapRef.current = initializeMap('map', ambulancePosition);
      trackerRef.current = startLocationTracking(
        mapRef.current,
        ambulancePosition,
        'ambulance'
      );
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current && trackerRef.current) {
        stopLocationTracking(mapRef.current, trackerRef.current, true);
        mapRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Update tracker when position changes
    if (trackerRef.current) {
      const validated = handleGPSCoordinates(ambulancePosition);
      if (validated) {
        updateTrackedLocation(trackerRef.current, validated, true);
      }
    }
  }, [ambulancePosition]);

  // Simulate GPS updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Get new position from GPS or simulation
      const newPosition = getGPSPosition();
      
      // Only update if change is significant
      if (isSignificantLocationChange(ambulancePosition, newPosition, 10)) {
        setAmbulancePosition(newPosition);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [ambulancePosition]);

  return <div id="map" style={{ height: '100vh', width: '100%' }} />;
}
```

## Testing

The MapService includes comprehensive unit tests covering:
- Map initialization with various configurations
- Marker creation and updates for all icon types
- Location tracking (start, update, stop)
- GPS coordinate validation and handling
- Distance calculation using Haversine formula
- Significant location change detection
- Map centering and panning
- Route drawing and color coding
- Edge cases (extreme coordinates, empty arrays, long routes, rapid updates)
- Cleanup operations (clearing routes, removing markers)

Run tests with:
```bash
npm test -- mapService.test.ts
```

## Design Decisions

### Custom Marker Icons
- Uses emoji-based icons for better visual recognition
- Circular design with colored backgrounds for consistency
- White borders and shadows for visibility on all map backgrounds
- Different sizes for different entity types (ambulance/police: 32px, congestion: 24px)

### Color Coding
- Follows traffic light metaphor (green/orange/red)
- Uses Tailwind CSS color palette for consistency with UI
- Higher opacity (0.8) for route segments vs regular routes (0.7)
- Thicker lines (weight: 6) for congestion segments vs regular routes (weight: 5)

### OpenStreetMap Integration
- Free and open-source map tiles
- No API key required
- Proper attribution included
- Zoom levels: 3 (min) to 19 (max)

## Performance Considerations

- Map instances are reused, not recreated
- Markers are updated in place rather than removed and recreated
- Route clearing uses efficient layer iteration
- Bounds fitting includes padding for better UX

## Browser Compatibility

Requires modern browsers with support for:
- ES6+ JavaScript features
- CSS3 (for custom marker styling)
- Canvas/SVG (for Leaflet rendering)

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- `leaflet`: ^1.9.4
- `@types/leaflet`: ^1.9.8 (dev)

## License

This service uses OpenStreetMap data, which is © OpenStreetMap contributors and available under the Open Database License (ODbL).
