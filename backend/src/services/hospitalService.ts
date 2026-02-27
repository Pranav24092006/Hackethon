/**
 * Hospital Service
 * 
 * Manages hospital data queries, distance calculations, and sorting.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT })
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.HOSPITALS_TABLE || 'Hospitals';

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
  createdAt?: string;
  updatedAt?: string;
}

interface HospitalWithDistance extends Hospital {
  distance: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 * 
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  
  const lat1Rad = toRadians(coord1.lat);
  const lat2Rad = toRadians(coord2.lat);
  const deltaLat = toRadians(coord2.lat - coord1.lat);
  const deltaLng = toRadians(coord2.lng - coord1.lng);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get all hospitals from the database
 * 
 * @returns Array of hospitals
 */
export async function getAllHospitals(): Promise<Hospital[]> {
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME
    });

    const response = await docClient.send(command);
    return (response.Items || []) as Hospital[];
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    throw new Error('Failed to fetch hospitals');
  }
}

/**
 * Get a single hospital by ID
 * 
 * @param hospitalId - Hospital ID
 * @returns Hospital object or null if not found
 */
export async function getHospitalById(hospitalId: string): Promise<Hospital | null> {
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: hospitalId }
    });

    const response = await docClient.send(command);
    return (response.Item as Hospital) || null;
  } catch (error) {
    console.error(`Error fetching hospital ${hospitalId}:`, error);
    throw new Error('Failed to fetch hospital');
  }
}

/**
 * Get hospitals sorted by distance from a given location
 * 
 * @param location - Current location coordinates
 * @param emergencyOnly - Filter to only emergency-capable hospitals
 * @returns Array of hospitals with distance, sorted by distance
 */
export async function getHospitalsSortedByDistance(
  location: Coordinates,
  emergencyOnly: boolean = false
): Promise<HospitalWithDistance[]> {
  try {
    // Get all hospitals
    let hospitals = await getAllHospitals();

    // Filter to emergency-capable only if requested
    if (emergencyOnly) {
      hospitals = hospitals.filter(h => h.emergencyCapable);
    }

    // Calculate distance for each hospital
    const hospitalsWithDistance: HospitalWithDistance[] = hospitals.map(hospital => ({
      ...hospital,
      distance: calculateDistance(location, hospital.location)
    }));

    // Sort by distance (ascending)
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

    return hospitalsWithDistance;
  } catch (error) {
    console.error('Error getting hospitals sorted by distance:', error);
    throw new Error('Failed to get hospitals sorted by distance');
  }
}

/**
 * Get the nearest hospital to a given location
 * 
 * @param location - Current location coordinates
 * @param emergencyOnly - Filter to only emergency-capable hospitals
 * @returns Nearest hospital with distance, or null if no hospitals found
 */
export async function getNearestHospital(
  location: Coordinates,
  emergencyOnly: boolean = false
): Promise<HospitalWithDistance | null> {
  try {
    const hospitals = await getHospitalsSortedByDistance(location, emergencyOnly);
    return hospitals.length > 0 ? hospitals[0] : null;
  } catch (error) {
    console.error('Error getting nearest hospital:', error);
    throw new Error('Failed to get nearest hospital');
  }
}

/**
 * Get hospitals within a specified radius
 * 
 * @param location - Current location coordinates
 * @param radiusKm - Radius in kilometers
 * @param emergencyOnly - Filter to only emergency-capable hospitals
 * @returns Array of hospitals within radius, sorted by distance
 */
export async function getHospitalsWithinRadius(
  location: Coordinates,
  radiusKm: number,
  emergencyOnly: boolean = false
): Promise<HospitalWithDistance[]> {
  try {
    const hospitals = await getHospitalsSortedByDistance(location, emergencyOnly);
    return hospitals.filter(h => h.distance <= radiusKm);
  } catch (error) {
    console.error('Error getting hospitals within radius:', error);
    throw new Error('Failed to get hospitals within radius');
  }
}
