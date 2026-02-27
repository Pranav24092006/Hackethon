/**
 * User Model
 * 
 * Represents a user in the Smart Emergency Route Optimizer system.
 * Users can be either ambulance drivers or police officers.
 */

export interface User {
  id: string                    // UUID
  username: string              // Unique username
  passwordHash: string          // bcrypt hash
  role: 'ambulance' | 'police' // User role
  phoneNumber?: string          // Optional phone for SMS
  createdAt: string            // ISO 8601 timestamp
  updatedAt: string            // ISO 8601 timestamp
}

export type UserRole = 'ambulance' | 'police';
