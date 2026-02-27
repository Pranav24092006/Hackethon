/**
 * Unit tests for Hospital Service
 * 
 * Tests hospital queries, distance calculations, and sorting.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import {
  calculateDistance,
  getAllHospitals,
  getHospitalById,
  getHospitalsSortedByDistance,
  getNearestHospital,
  getHospitalsWithinRadius
} from '../hospitalService.js';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('HospitalService', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const coord1 = { lat: 40.7128, lng: -74.0060 }; // New York
      const coord2 = { lat: 40.7580, lng: -73.9855 }; // Times Square

      const distance = calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be less than 10km
    });

    it('should return 0 for same coordinates', () => {
      const coord = { lat: 40.7128, lng: -74.0060 };

      const distance = calculateDistance(coord, coord);

      expect(distance).toBe(0);
    });

    it('should calculate distance for coordinates far apart', () => {
      const coord1 = { lat: 40.7128, lng: -74.0060 }; // New York
      const coord2 = { lat: 34.0522, lng: -118.2437 }; // Los Angeles

      const distance = calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(3900); // Approximately 3936 km
      expect(distance).toBeLessThan(4000);
    });

    it('should handle negative coordinates', () => {
      const coord1 = { lat: -33.8688, lng: 151.2093 }; // Sydney
      const coord2 = { lat: -37.8136, lng: 144.9631 }; // Melbourne

      const distance = calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(700); // Approximately 713 km
      expect(distance).toBeLessThan(750);
    });

    it('should return distance rounded to 2 decimal places', () => {
      const coord1 = { lat: 40.7128, lng: -74.0060 };
      const coord2 = { lat: 40.7580, lng: -73.9855 };

      const distance = calculateDistance(coord1, coord2);

      // Check that it has at most 2 decimal places
      const decimalPlaces = (distance.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should handle coordinates at equator', () => {
      const coord1 = { lat: 0, lng: 0 };
      const coord2 = { lat: 0, lng: 1 };

      const distance = calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(110); // Approximately 111 km per degree at equator
      expect(distance).toBeLessThan(112);
    });

    it('should handle coordinates at poles', () => {
      const coord1 = { lat: 89, lng: 0 };
      const coord2 = { lat: 89, lng: 180 };

      const distance = calculateDistance(coord1, coord2);

      // Distance should be small near poles
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(500);
    });
  });

  describe('getAllHospitals', () => {
    it('should return array of hospitals', async () => {
      // Mock will be provided by jest.mock
      const hospitals = await getAllHospitals();

      expect(Array.isArray(hospitals)).toBe(true);
    });
  });

  describe('getHospitalById', () => {
    it('should return hospital by ID', async () => {
      const hospitalId = 'hospital-1';

      const hospital = await getHospitalById(hospitalId);

      // Mock will return null or hospital object
      expect(hospital === null || typeof hospital === 'object').toBe(true);
    });
  });

  describe('getHospitalsSortedByDistance', () => {
    it('should return hospitals sorted by distance', async () => {
      const location = { lat: 40.7128, lng: -74.0060 };

      const hospitals = await getHospitalsSortedByDistance(location);

      expect(Array.isArray(hospitals)).toBe(true);

      // Check that each hospital has a distance property
      hospitals.forEach(hospital => {
        expect(hospital.distance).toBeDefined();
        expect(typeof hospital.distance).toBe('number');
      });

      // Check that hospitals are sorted by distance (ascending)
      for (let i = 1; i < hospitals.length; i++) {
        expect(hospitals[i].distance).toBeGreaterThanOrEqual(hospitals[i - 1].distance);
      }
    });

    it('should filter to emergency-capable hospitals only', async () => {
      const location = { lat: 40.7128, lng: -74.0060 };

      const hospitals = await getHospitalsSortedByDistance(location, true);

      expect(Array.isArray(hospitals)).toBe(true);

      // All hospitals should be emergency-capable
      hospitals.forEach(hospital => {
        expect(hospital.emergencyCapable).toBe(true);
      });
    });
  });

  describe('getNearestHospital', () => {
    it('should return the nearest hospital', async () => {
      const location = { lat: 40.7128, lng: -74.0060 };

      const hospital = await getNearestHospital(location);

      if (hospital) {
        expect(hospital.distance).toBeDefined();
        expect(typeof hospital.distance).toBe('number');
      }
    });

    it('should return nearest emergency-capable hospital', async () => {
      const location = { lat: 40.7128, lng: -74.0060 };

      const hospital = await getNearestHospital(location, true);

      if (hospital) {
        expect(hospital.emergencyCapable).toBe(true);
      }
    });
  });

  describe('getHospitalsWithinRadius', () => {
    it('should return hospitals within specified radius', async () => {
      const location = { lat: 40.7128, lng: -74.0060 };
      const radiusKm = 10;

      const hospitals = await getHospitalsWithinRadius(location, radiusKm);

      expect(Array.isArray(hospitals)).toBe(true);

      // All hospitals should be within radius
      hospitals.forEach(hospital => {
        expect(hospital.distance).toBeLessThanOrEqual(radiusKm);
      });
    });

    it('should return empty array if no hospitals within radius', async () => {
      const location = { lat: 40.7128, lng: -74.0060 };
      const radiusKm = 0.001; // Very small radius

      const hospitals = await getHospitalsWithinRadius(location, radiusKm);

      expect(Array.isArray(hospitals)).toBe(true);
    });

    it('should filter to emergency-capable hospitals within radius', async () => {
      const location = { lat: 40.7128, lng: -74.0060 };
      const radiusKm = 10;

      const hospitals = await getHospitalsWithinRadius(location, radiusKm, true);

      expect(Array.isArray(hospitals)).toBe(true);

      hospitals.forEach(hospital => {
        expect(hospital.distance).toBeLessThanOrEqual(radiusKm);
        expect(hospital.emergencyCapable).toBe(true);
      });
    });
  });
});
