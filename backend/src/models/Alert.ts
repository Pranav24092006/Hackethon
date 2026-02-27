/**
 * Alert Model
 * 
 * Represents an emergency alert in the Smart Emergency Route Optimizer system.
 * Alerts are created by ambulance drivers to notify police of traffic blockages.
 */

export interface Alert {
  id: string                   // UUID
  ambulanceId: string          // Reference to ambulance user
  ambulanceLocation: {
    lat: number
    lng: number
  }
  destination: {
    lat: number
    lng: number
  }
  congestionPoint: {
    lat: number
    lng: number
  }
  message: string              // Alert description
  status: AlertStatus          // Current status
  createdAt: string           // ISO 8601 timestamp
  updatedAt: string           // ISO 8601 timestamp
  clearedAt?: string          // ISO 8601 timestamp when cleared
}

export type AlertStatus = 'pending' | 'dispatched' | 'cleared' | 'cancelled';
