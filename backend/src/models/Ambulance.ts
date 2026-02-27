/**
 * Ambulance Model
 * 
 * Represents an ambulance in the Smart Emergency Route Optimizer system.
 * Tracks vehicle information, current location, and operational status.
 */

export interface Ambulance {
  id: string                   // UUID (matches user ID)
  vehicleNumber: string        // Vehicle identification
  currentLocation: {
    lat: number
    lng: number
  }
  status: AmbulanceStatus
  currentRoute?: Route         // Active route if en-route
  lastUpdated: string         // ISO 8601 timestamp
}

export type AmbulanceStatus = 'available' | 'en-route' | 'at-scene' | 'transporting';

/**
 * Route interface for ambulance's current route
 */
export interface Route {
  id: string
  startLocation: {
    lat: number
    lng: number
  }
  destination: {
    lat: number
    lng: number
  }
  path: Array<{
    lat: number
    lng: number
  }>
  totalDistance: number        // In kilometers
  estimatedTime: number        // In minutes
}
