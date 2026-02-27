/**
 * Simulation Engine Service
 * 
 * Generates simulated GPS coordinates, traffic data, and hospital locations
 * for testing and demonstration purposes.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed

interface Coordinates {
  lat: number;
  lng: number;
}

interface Hospital {
  id: string;
  name: string;
  location: Coordinates;
  address: string;
  capacity: number;
  emergencyCapable: boolean;
  phoneNumber: string;
}

interface CongestionData {
  segmentId: string;
  density: number;
  timestamp: string;
}

interface RoadNetwork {
  nodes: Map<string, any>;
  edges: Map<string, any[]>;
}

// Simulation mode state
let simulationMode = false;

// GPS update interval (2 seconds)
const GPS_UPDATE_INTERVAL = 2000;

// Active GPS simulation intervals
const activeGPSIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Generate simulated GPS path between start and end coordinates
 * Uses linear interpolation with random noise to simulate GPS inaccuracy
 * 
 * @param start - Starting coordinates
 * @param end - Ending coordinates
 * @param steps - Number of intermediate points
 * @returns Array of coordinates representing the path
 */
export function generateGPSPath(start: Coordinates, end: Coordinates, steps: number): Coordinates[] {
  if (steps < 2) {
    throw new Error('Steps must be at least 2');
  }

  const path: Coordinates[] = [];
  
  // Calculate step size
  const latStep = (end.lat - start.lat) / (steps - 1);
  const lngStep = (end.lng - start.lng) / (steps - 1);
  
  // Generate path with linear interpolation
  for (let i = 0; i < steps; i++) {
    const lat = start.lat + (latStep * i);
    const lng = start.lng + (lngStep * i);
    
    // Add random noise (±0.001 degrees) to simulate GPS inaccuracy
    const noiseLat = (Math.random() - 0.5) * 0.002;
    const noiseLng = (Math.random() - 0.5) * 0.002;
    
    path.push({
      lat: lat + noiseLat,
      lng: lng + noiseLng
    });
  }
  
  return path;
}

/**
 * Generate random traffic congestion data for a road network
 * Distribution: 60% green, 30% orange, 10% red
 * 
 * @param roadNetwork - Road network structure
 * @returns Array of congestion data for road segments
 */
export function generateTrafficData(roadNetwork: RoadNetwork): CongestionData[] {
  const congestionData: CongestionData[] = [];
  const timestamp = new Date().toISOString();
  
  // Iterate through all edges in the road network
  roadNetwork.edges.forEach((edges, nodeId) => {
    edges.forEach((edge, index) => {
      // Generate random density based on distribution
      const random = Math.random();
      let density: number;
      
      if (random < 0.6) {
        // 60% green (0-0.3)
        density = Math.random() * 0.3;
      } else if (random < 0.9) {
        // 30% orange (0.3-0.7)
        density = 0.3 + (Math.random() * 0.4);
      } else {
        // 10% red (0.7-1.0)
        density = 0.7 + (Math.random() * 0.3);
      }
      
      congestionData.push({
        segmentId: `${nodeId}-${index}`,
        density,
        timestamp
      });
    });
  });
  
  return congestionData;
}

/**
 * Get sample hospital locations for simulation
 * Returns 5-10 hospitals in major city areas
 * 
 * @returns Array of hospital objects
 */
export function getSampleHospitals(): Hospital[] {
  return [
    {
      id: 'hospital-1',
      name: 'City General Hospital',
      location: { lat: 40.7580, lng: -73.9855 },
      address: '123 Main St, New York, NY 10001',
      capacity: 500,
      emergencyCapable: true,
      phoneNumber: '+1-555-0101'
    },
    {
      id: 'hospital-2',
      name: 'Metropolitan Medical Center',
      location: { lat: 40.7489, lng: -73.9680 },
      address: '456 Park Ave, New York, NY 10022',
      capacity: 350,
      emergencyCapable: true,
      phoneNumber: '+1-555-0102'
    },
    {
      id: 'hospital-3',
      name: 'Downtown Emergency Clinic',
      location: { lat: 40.7128, lng: -74.0060 },
      address: '789 Broadway, New York, NY 10003',
      capacity: 200,
      emergencyCapable: true,
      phoneNumber: '+1-555-0103'
    },
    {
      id: 'hospital-4',
      name: 'Riverside Hospital',
      location: { lat: 40.7614, lng: -73.9776 },
      address: '321 River Rd, New York, NY 10019',
      capacity: 400,
      emergencyCapable: true,
      phoneNumber: '+1-555-0104'
    },
    {
      id: 'hospital-5',
      name: 'Northside Medical Center',
      location: { lat: 40.7829, lng: -73.9654 },
      address: '654 North St, New York, NY 10025',
      capacity: 300,
      emergencyCapable: true,
      phoneNumber: '+1-555-0105'
    },
    {
      id: 'hospital-6',
      name: 'Eastside Community Hospital',
      location: { lat: 40.7282, lng: -73.9942 },
      address: '987 East Ave, New York, NY 10009',
      capacity: 250,
      emergencyCapable: false,
      phoneNumber: '+1-555-0106'
    },
    {
      id: 'hospital-7',
      name: 'Westside Regional Hospital',
      location: { lat: 40.7589, lng: -73.9851 },
      address: '147 West St, New York, NY 10023',
      capacity: 450,
      emergencyCapable: true,
      phoneNumber: '+1-555-0107'
    },
    {
      id: 'hospital-8',
      name: 'Central City Medical',
      location: { lat: 40.7484, lng: -73.9857 },
      address: '258 Central Blvd, New York, NY 10018',
      capacity: 380,
      emergencyCapable: true,
      phoneNumber: '+1-555-0108'
    }
  ];
}

/**
 * Set simulation mode on or off
 * 
 * @param enabled - True to enable simulation mode, false to disable
 */
export function setSimulationMode(enabled: boolean): void {
  simulationMode = enabled;
  console.log(`Simulation mode ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if simulation mode is currently active
 * 
 * @returns True if simulation mode is enabled
 */
export function isSimulationMode(): boolean {
  return simulationMode;
}

/**
 * Start periodic GPS updates for a user in simulation mode
 * Emits location updates every 2 seconds along a generated path
 * 
 * @param userId - User ID to generate updates for
 * @param start - Starting coordinates
 * @param end - Ending coordinates
 * @param callback - Function to call with each location update
 * @returns Interval ID that can be used to stop updates
 */
export function startPeriodicGPSUpdates(
  userId: string,
  start: Coordinates,
  end: Coordinates,
  callback: (location: Coordinates) => void
): NodeJS.Timeout {
  // Stop any existing updates for this user
  stopPeriodicGPSUpdates(userId);
  
  // Generate path with 50 steps
  const path = generateGPSPath(start, end, 50);
  let currentStep = 0;
  
  // Create interval for periodic updates
  const interval = setInterval(() => {
    if (currentStep < path.length) {
      callback(path[currentStep]);
      currentStep++;
    } else {
      // Path complete, restart from beginning
      currentStep = 0;
    }
  }, GPS_UPDATE_INTERVAL);
  
  // Store interval for cleanup
  activeGPSIntervals.set(userId, interval);
  
  return interval;
}

/**
 * Stop periodic GPS updates for a user
 * 
 * @param userId - User ID to stop updates for
 */
export function stopPeriodicGPSUpdates(userId: string): void {
  const interval = activeGPSIntervals.get(userId);
  if (interval) {
    clearInterval(interval);
    activeGPSIntervals.delete(userId);
    console.log(`Stopped GPS updates for user ${userId}`);
  }
}

/**
 * Stop all active GPS update intervals
 * Useful for cleanup during shutdown
 */
export function stopAllGPSUpdates(): void {
  activeGPSIntervals.forEach((interval, userId) => {
    clearInterval(interval);
    console.log(`Stopped GPS updates for user ${userId}`);
  });
  activeGPSIntervals.clear();
}

/**
 * Get the number of active GPS update intervals
 * 
 * @returns Number of active intervals
 */
export function getActiveGPSUpdateCount(): number {
  return activeGPSIntervals.size;
}
