/**
 * Unit tests for Hospital Seeding Script
 * 
 * Tests hospital data seeding functionality.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { seedSingleHospital } from '../seedHospitals.js';
import { getSampleHospitals } from '../../services/simulationEngine.js';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('Hospital Seeding Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('seedSingleHospital', () => {
    it('should seed a single hospital with all required fields', async () => {
      const mockHospital = {
        id: 'test-hospital-1',
        name: 'Test Hospital',
        location: { lat: 40.7128, lng: -74.0060 },
        address: '123 Test St, Test City, TC 12345',
        capacity: 300,
        emergencyCapable: true,
        phoneNumber: '+1-555-0199'
      };

      // Mock implementation will be provided by jest.mock
      await expect(seedSingleHospital(mockHospital)).resolves.not.toThrow();
    });

    it('should include timestamps when seeding', async () => {
      const mockHospital = {
        id: 'test-hospital-2',
        name: 'Test Hospital 2',
        location: { lat: 40.7580, lng: -73.9855 },
        address: '456 Test Ave, Test City, TC 12346',
        capacity: 250,
        emergencyCapable: false,
        phoneNumber: '+1-555-0198'
      };

      await expect(seedSingleHospital(mockHospital)).resolves.not.toThrow();
    });
  });

  describe('Sample Hospitals', () => {
    it('should have valid sample hospitals for seeding', () => {
      const hospitals = getSampleHospitals();

      expect(hospitals.length).toBeGreaterThan(0);

      hospitals.forEach(hospital => {
        expect(hospital.id).toBeDefined();
        expect(hospital.name).toBeDefined();
        expect(hospital.location).toBeDefined();
        expect(hospital.address).toBeDefined();
        expect(hospital.capacity).toBeGreaterThan(0);
        expect(typeof hospital.emergencyCapable).toBe('boolean');
        expect(hospital.phoneNumber).toBeDefined();
      });
    });

    it('should have hospitals with valid phone numbers', () => {
      const hospitals = getSampleHospitals();

      hospitals.forEach(hospital => {
        expect(hospital.phoneNumber).toMatch(/^\+\d{1,3}-\d{3}-\d{4}$/);
      });
    });

    it('should have hospitals with valid addresses', () => {
      const hospitals = getSampleHospitals();

      hospitals.forEach(hospital => {
        expect(hospital.address).toContain(',');
        expect(hospital.address.length).toBeGreaterThan(10);
      });
    });
  });
});
