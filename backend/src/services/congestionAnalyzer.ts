/**
 * Congestion Analyzer Service
 * 
 * Evaluates traffic density and assigns congestion levels to road segments.
 * Provides real-time congestion analysis for route optimization.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed

interface Coordinates {
  lat: number;
  lng: number;
}

interface RoadEdge {
  from: string;
  to: string;
  distance: number;
  congestionWeight: number;
}

interface Route {
  path: Coordinates[];
  segments: RouteSegment[];
  totalDistance: number;
  estimatedTime: number;
}

interface RouteSegment {
  start: Coordinates;
  end: Coordinates;
  distance: number;
  congestionLevel: CongestionLevel;
}

type CongestionLevel = 'green' | 'orange' | 'red';

interface CongestionData {
  segmentId: string;
  density: number;
  timestamp: string;
}

// In-memory storage for congestion data
const congestionDataStore = new Map<string, CongestionData>();

// Congestion update interval (30 seconds)
const CONGESTION_UPDATE_INTERVAL = 30000;

// Active congestion update interval
let congestionUpdateInterval: NodeJS.Timeout | null = null;

/**
 * Analyze congestion for a specific road segment
 * Maps density to congestion levels:
 * - green: 0-0.3
 * - orange: 0.3-0.7
 * - red: 0.7-1.0
 * 
 * @param segment - Road edge to analyze
 * @returns Congestion level (green, orange, or red)
 */
export function analyzeCongestion(segment: RoadEdge): CongestionLevel {
  // Get congestion data for this segment
  const segmentId = `${segment.from}-${segment.to}`;
  const congestionData = congestionDataStore.get(segmentId);
  
  // Default to green if no data available
  if (!congestionData) {
    return 'green';
  }
  
  const density = congestionData.density;
  
  // Map density to congestion level based on thresholds
  if (density < 0.3) {
    return 'green';
  } else if (density < 0.7) {
    return 'orange';
  } else {
    return 'red';
  }
}

/**
 * Get congestion data for an entire route
 * Returns a map of segment IDs to congestion levels
 * 
 * @param route - Route to analyze
 * @returns Map of segment IDs to congestion levels
 */
export function getRouteCongestion(route: Route): Map<string, CongestionLevel> {
  const routeCongestion = new Map<string, CongestionLevel>();
  
  // Analyze each segment in the route
  route.segments.forEach((segment, index) => {
    const segmentId = `segment-${index}`;
    routeCongestion.set(segmentId, segment.congestionLevel);
  });
  
  return routeCongestion;
}

/**
 * Update congestion data for road segments
 * Stores the data in memory for quick access
 * 
 * @param data - Array of congestion data to update
 */
export function updateCongestionData(data: CongestionData[]): void {
  data.forEach(congestionData => {
    congestionDataStore.set(congestionData.segmentId, congestionData);
  });
  
  console.log(`Updated congestion data for ${data.length} segments`);
}

/**
 * Get current congestion data for a specific segment
 * 
 * @param segmentId - Segment ID to query
 * @returns Congestion data or undefined if not found
 */
export function getCongestionData(segmentId: string): CongestionData | undefined {
  return congestionDataStore.get(segmentId);
}

/**
 * Get all current congestion data
 * 
 * @returns Array of all congestion data
 */
export function getAllCongestionData(): CongestionData[] {
  return Array.from(congestionDataStore.values());
}

/**
 * Clear all congestion data
 * Useful for testing and reset scenarios
 */
export function clearCongestionData(): void {
  congestionDataStore.clear();
  console.log('Cleared all congestion data');
}

/**
 * Start periodic congestion data updates
 * Updates congestion data every 30 seconds using the provided callback
 * 
 * @param updateCallback - Function to call for generating new congestion data
 */
export function startPeriodicCongestionUpdates(
  updateCallback: () => CongestionData[]
): void {
  // Stop any existing updates
  stopPeriodicCongestionUpdates();
  
  // Initial update
  const initialData = updateCallback();
  updateCongestionData(initialData);
  
  // Set up periodic updates
  congestionUpdateInterval = setInterval(() => {
    const data = updateCallback();
    updateCongestionData(data);
  }, CONGESTION_UPDATE_INTERVAL);
  
  console.log('Started periodic congestion updates (every 30 seconds)');
}

/**
 * Stop periodic congestion data updates
 */
export function stopPeriodicCongestionUpdates(): void {
  if (congestionUpdateInterval) {
    clearInterval(congestionUpdateInterval);
    congestionUpdateInterval = null;
    console.log('Stopped periodic congestion updates');
  }
}

/**
 * Check if periodic updates are active
 * 
 * @returns True if updates are running
 */
export function isPeriodicUpdatesActive(): boolean {
  return congestionUpdateInterval !== null;
}

/**
 * Get congestion weight multiplier for route optimization
 * Used by A* algorithm to factor congestion into path cost
 * 
 * @param level - Congestion level
 * @returns Weight multiplier (1.0 for green, 1.5 for orange, 3.0 for red)
 */
export function getCongestionWeight(level: CongestionLevel): number {
  switch (level) {
    case 'green':
      return 1.0;
    case 'orange':
      return 1.5;
    case 'red':
      return 3.0;
    default:
      return 1.0;
  }
}

/**
 * Get congestion level from density value
 * Useful for converting raw density to level
 * 
 * @param density - Density value (0-1)
 * @returns Congestion level
 */
export function getCongestionLevelFromDensity(density: number): CongestionLevel {
  if (density < 0.3) {
    return 'green';
  } else if (density < 0.7) {
    return 'orange';
  } else {
    return 'red';
  }
}
