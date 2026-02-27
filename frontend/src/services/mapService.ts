import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * MapService - Handles map rendering and interactions using Leaflet.js
 * 
 * Provides functions to:
 * - Initialize maps with OpenStreetMap tiles
 * - Add and update markers for ambulances and police
 * - Draw and color-code routes based on congestion
 * 
 * Requirements: 2.1, 2.2, 2.5
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  start: Coordinates;
  end: Coordinates;
  congestionLevel: 'green' | 'orange' | 'red';
}

export type MarkerIcon = 'ambulance' | 'police' | 'hospital' | 'congestion';

/**
 * Initialize a Leaflet map with OpenStreetMap tiles
 * 
 * @param containerId - HTML element ID where the map will be rendered
 * @param center - Initial center coordinates for the map
 * @param zoom - Initial zoom level (default: 13 for city view)
 * @returns Leaflet Map instance
 */
export function initializeMap(
  containerId: string,
  center: Coordinates,
  zoom: number = 13
): L.Map {
  // Create map instance
  const map = L.map(containerId).setView([center.lat, center.lng], zoom);

  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    minZoom: 3,
  }).addTo(map);

  return map;
}

/**
 * Create custom marker icons for different entity types
 */
function createMarkerIcon(type: MarkerIcon): L.DivIcon {
  const iconConfig = {
    ambulance: {
      html: `<div style="background-color: #ef4444; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚑</div>`,
      className: 'custom-ambulance-icon',
      iconSize: [32, 32] as [number, number],
      iconAnchor: [16, 16] as [number, number],
    },
    police: {
      html: `<div style="background-color: #3b82f6; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚓</div>`,
      className: 'custom-police-icon',
      iconSize: [32, 32] as [number, number],
      iconAnchor: [16, 16] as [number, number],
    },
    hospital: {
      html: `<div style="background-color: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏥</div>`,
      className: 'custom-hospital-icon',
      iconSize: [32, 32] as [number, number],
      iconAnchor: [16, 16] as [number, number],
    },
    congestion: {
      html: `<div style="background-color: #f59e0b; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">⚠️</div>`,
      className: 'custom-congestion-icon',
      iconSize: [24, 24] as [number, number],
      iconAnchor: [12, 12] as [number, number],
    },
  };

  const config = iconConfig[type];
  return L.divIcon({
    html: config.html,
    className: config.className,
    iconSize: config.iconSize,
    iconAnchor: config.iconAnchor,
  });
}

/**
 * Add a marker to the map
 * 
 * @param map - Leaflet Map instance
 * @param coordinates - Position for the marker
 * @param icon - Type of marker icon to display
 * @returns Leaflet Marker instance
 */
export function addMarker(
  map: L.Map,
  coordinates: Coordinates,
  icon: MarkerIcon
): L.Marker {
  const customIcon = createMarkerIcon(icon);
  const marker = L.marker([coordinates.lat, coordinates.lng], {
    icon: customIcon,
  }).addTo(map);

  return marker;
}

/**
 * Update an existing marker's position
 * 
 * @param marker - Leaflet Marker instance to update
 * @param coordinates - New position for the marker
 */
export function updateMarker(marker: L.Marker, coordinates: Coordinates): void {
  marker.setLatLng([coordinates.lat, coordinates.lng]);
}

/**
 * Draw a route polyline on the map
 * 
 * @param map - Leaflet Map instance
 * @param path - Array of coordinates representing the route
 * @param color - Color for the route line
 * @returns Leaflet Polyline instance
 */
export function drawRoute(
  map: L.Map,
  path: Coordinates[],
  color: string = '#3b82f6'
): L.Polyline {
  const latLngs = path.map((coord) => [coord.lat, coord.lng] as [number, number]);
  
  const polyline = L.polyline(latLngs, {
    color: color,
    weight: 5,
    opacity: 0.7,
  }).addTo(map);

  return polyline;
}

/**
 * Color-code route segments based on congestion levels
 * 
 * @param map - Leaflet Map instance
 * @param segments - Array of route segments with congestion levels
 * @returns Array of Leaflet Polyline instances
 */
export function colorCodeRoute(
  map: L.Map,
  segments: RouteSegment[]
): L.Polyline[] {
  const congestionColors = {
    green: '#10b981',  // Green for clear
    orange: '#f59e0b', // Orange for moderate
    red: '#ef4444',    // Red for congested
  };

  const polylines: L.Polyline[] = [];

  segments.forEach((segment) => {
    const color = congestionColors[segment.congestionLevel];
    const polyline = L.polyline(
      [
        [segment.start.lat, segment.start.lng],
        [segment.end.lat, segment.end.lng],
      ],
      {
        color: color,
        weight: 6,
        opacity: 0.8,
      }
    ).addTo(map);

    polylines.push(polyline);
  });

  return polylines;
}

/**
 * Remove all routes from the map
 * 
 * @param map - Leaflet Map instance
 */
export function clearRoutes(map: L.Map): void {
  map.eachLayer((layer: L.Layer) => {
    if (layer instanceof L.Polyline) {
      map.removeLayer(layer);
    }
  });
}

/**
 * Remove a specific marker from the map
 * 
 * @param map - Leaflet Map instance
 * @param marker - Marker to remove
 */
export function removeMarker(map: L.Map, marker: L.Marker): void {
  map.removeLayer(marker);
}

/**
 * Fit map bounds to show all markers and routes
 * 
 * @param map - Leaflet Map instance
 * @param coordinates - Array of coordinates to fit in view
 */
export function fitBounds(map: L.Map, coordinates: Coordinates[]): void {
  if (coordinates.length === 0) return;

  const bounds = L.latLngBounds(
    coordinates.map((coord) => [coord.lat, coord.lng] as [number, number])
  );

  map.fitBounds(bounds, { padding: [50, 50] });
}

/**
 * Location tracking functionality
 * Requirements: 2.2, 2.3, 2.4
 */

export interface LocationTracker {
  marker: L.Marker;
  lastUpdate: Date;
  isTracking: boolean;
}

/**
 * Start tracking a location with real-time updates
 * 
 * @param map - Leaflet Map instance
 * @param initialCoordinates - Starting position
 * @param icon - Marker icon type
 * @returns LocationTracker object
 */
export function startLocationTracking(
  map: L.Map,
  initialCoordinates: Coordinates,
  icon: MarkerIcon = 'ambulance'
): LocationTracker {
  const marker = addMarker(map, initialCoordinates, icon);
  
  return {
    marker,
    lastUpdate: new Date(),
    isTracking: true,
  };
}

/**
 * Update tracked location with new GPS coordinates
 * 
 * @param tracker - LocationTracker object
 * @param coordinates - New GPS coordinates
 * @param smoothTransition - Whether to animate the marker movement
 */
export function updateTrackedLocation(
  tracker: LocationTracker,
  coordinates: Coordinates,
  smoothTransition: boolean = true
): void {
  if (!tracker.isTracking) {
    return;
  }

  if (smoothTransition) {
    // Smooth transition using Leaflet's built-in animation
    tracker.marker.setLatLng([coordinates.lat, coordinates.lng]);
  } else {
    // Instant update without animation
    tracker.marker.setLatLng([coordinates.lat, coordinates.lng]);
  }

  tracker.lastUpdate = new Date();
}

/**
 * Stop tracking a location and optionally remove the marker
 * 
 * @param map - Leaflet Map instance
 * @param tracker - LocationTracker object
 * @param removeMarker - Whether to remove the marker from the map
 */
export function stopLocationTracking(
  map: L.Map,
  tracker: LocationTracker,
  removeMarkerFromMap: boolean = false
): void {
  tracker.isTracking = false;
  
  if (removeMarkerFromMap) {
    map.removeLayer(tracker.marker);
  }
}

/**
 * Handle GPS coordinate updates (supports both real and simulated GPS)
 * 
 * @param coordinates - GPS coordinates to validate and process
 * @returns Validated coordinates or null if invalid
 */
export function handleGPSCoordinates(coordinates: Coordinates): Coordinates | null {
  // Validate coordinate ranges
  if (
    coordinates.lat < -90 ||
    coordinates.lat > 90 ||
    coordinates.lng < -180 ||
    coordinates.lng > 180
  ) {
    console.error('Invalid GPS coordinates:', coordinates);
    return null;
  }

  // Return validated coordinates
  return {
    lat: coordinates.lat,
    lng: coordinates.lng,
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Used to determine if location has changed significantly
 * 
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if location update is significant enough to process
 * Helps reduce unnecessary updates for minor GPS fluctuations
 * 
 * @param oldCoord - Previous coordinates
 * @param newCoord - New coordinates
 * @param threshold - Minimum distance in meters to consider significant (default: 10m)
 * @returns True if update is significant
 */
export function isSignificantLocationChange(
  oldCoord: Coordinates,
  newCoord: Coordinates,
  threshold: number = 10
): boolean {
  const distance = calculateDistance(oldCoord, newCoord);
  return distance >= threshold;
}

/**
 * Center map on a specific location with optional zoom
 * 
 * @param map - Leaflet Map instance
 * @param coordinates - Coordinates to center on
 * @param zoom - Optional zoom level
 */
export function centerMapOnLocation(
  map: L.Map,
  coordinates: Coordinates,
  zoom?: number
): void {
  if (zoom !== undefined) {
    map.setView([coordinates.lat, coordinates.lng], zoom);
  } else {
    map.panTo([coordinates.lat, coordinates.lng]);
  }
}
