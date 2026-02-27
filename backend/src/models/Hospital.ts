/**
 * Hospital Model
 * 
 * Represents a hospital in the Smart Emergency Route Optimizer system.
 * Hospitals serve as destinations for ambulance routes.
 */

export interface Hospital {
  id: string                   // UUID
  name: string                 // Hospital name
  location: {
    lat: number
    lng: number
  }
  address: string
  capacity: number             // Bed capacity
  emergencyCapable: boolean    // Has emergency department
  phoneNumber: string
}
