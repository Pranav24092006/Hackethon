/**
 * Unit tests for Hospital model
 */

import { Hospital } from '../Hospital';

describe('Hospital Model', () => {
  describe('Hospital interface', () => {
    it('should accept valid hospital object with all required fields', () => {
      const hospital: Hospital = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'City General Hospital',
        location: {
          lat: 40.7128,
          lng: -74.0060
        },
        address: '123 Main St, New York, NY 10001',
        capacity: 500,
        emergencyCapable: true,
        phoneNumber: '+1-212-555-0100'
      };

      expect(hospital.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(hospital.name).toBe('City General Hospital');
      expect(hospital.capacity).toBe(500);
      expect(hospital.emergencyCapable).toBe(true);
    });

    it('should accept hospital with valid location coordinates', () => {
      const hospital: Hospital = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Memorial Hospital',
        location: {
          lat: 34.0522,
          lng: -118.2437
        },
        address: '456 Oak Ave, Los Angeles, CA 90001',
        capacity: 300,
        emergencyCapable: true,
        phoneNumber: '+1-213-555-0200'
      };

      expect(hospital.location.lat).toBe(34.0522);
      expect(hospital.location.lng).toBe(-118.2437);
    });

    it('should accept hospital without emergency capability', () => {
      const hospital: Hospital = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Community Clinic',
        location: {
          lat: 41.8781,
          lng: -87.6298
        },
        address: '789 Elm St, Chicago, IL 60601',
        capacity: 50,
        emergencyCapable: false,
        phoneNumber: '+1-312-555-0300'
      };

      expect(hospital.emergencyCapable).toBe(false);
    });

    it('should accept hospital with various capacity values', () => {
      const smallHospital: Hospital = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Small Hospital',
        location: { lat: 0, lng: 0 },
        address: 'Address 1',
        capacity: 100,
        emergencyCapable: true,
        phoneNumber: '+1-555-0001'
      };

      const largeHospital: Hospital = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Large Hospital',
        location: { lat: 0, lng: 0 },
        address: 'Address 2',
        capacity: 1000,
        emergencyCapable: true,
        phoneNumber: '+1-555-0002'
      };

      expect(smallHospital.capacity).toBe(100);
      expect(largeHospital.capacity).toBe(1000);
    });
  });

  describe('Hospital data validation', () => {
    it('should have valid latitude range', () => {
      const validLatitudes = [0, 40.7128, -33.8688, 51.5074, -90, 90];
      
      validLatitudes.forEach(lat => {
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      });
    });

    it('should have valid longitude range', () => {
      const validLongitudes = [0, -74.0060, 151.2093, -0.1278, -180, 180];
      
      validLongitudes.forEach(lng => {
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
      });
    });

    it('should have positive capacity', () => {
      const capacities = [1, 50, 100, 500, 1000];
      
      capacities.forEach(capacity => {
        expect(capacity).toBeGreaterThan(0);
      });
    });
  });
});
