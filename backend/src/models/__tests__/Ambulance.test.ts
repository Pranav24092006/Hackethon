/**
 * Unit tests for Ambulance model
 */

import { Ambulance, AmbulanceStatus, Route } from '../Ambulance';

describe('Ambulance Model', () => {
  describe('Ambulance interface', () => {
    it('should accept valid ambulance object with all required fields', () => {
      const ambulance: Ambulance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        vehicleNumber: 'AMB-001',
        currentLocation: {
          lat: 40.7128,
          lng: -74.0060
        },
        status: 'available',
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };

      expect(ambulance.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(ambulance.vehicleNumber).toBe('AMB-001');
      expect(ambulance.status).toBe('available');
      expect(ambulance.currentLocation.lat).toBe(40.7128);
      expect(ambulance.currentLocation.lng).toBe(-74.0060);
    });

    it('should accept ambulance object with optional currentRoute', () => {
      const route: Route = {
        id: 'route-123',
        startLocation: {
          lat: 40.7128,
          lng: -74.0060
        },
        destination: {
          lat: 40.7589,
          lng: -73.9851
        },
        path: [
          { lat: 40.7128, lng: -74.0060 },
          { lat: 40.7300, lng: -74.0000 },
          { lat: 40.7589, lng: -73.9851 }
        ],
        totalDistance: 5.2,
        estimatedTime: 15
      };

      const ambulance: Ambulance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        vehicleNumber: 'AMB-001',
        currentLocation: {
          lat: 40.7128,
          lng: -74.0060
        },
        status: 'en-route',
        currentRoute: route,
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };

      expect(ambulance.currentRoute).toBeDefined();
      expect(ambulance.currentRoute?.id).toBe('route-123');
      expect(ambulance.currentRoute?.totalDistance).toBe(5.2);
      expect(ambulance.currentRoute?.estimatedTime).toBe(15);
    });

    it('should accept available status', () => {
      const status: AmbulanceStatus = 'available';
      expect(status).toBe('available');
    });

    it('should accept en-route status', () => {
      const status: AmbulanceStatus = 'en-route';
      expect(status).toBe('en-route');
    });

    it('should accept at-scene status', () => {
      const status: AmbulanceStatus = 'at-scene';
      expect(status).toBe('at-scene');
    });

    it('should accept transporting status', () => {
      const status: AmbulanceStatus = 'transporting';
      expect(status).toBe('transporting');
    });
  });

  describe('Ambulance location data validation', () => {
    it('should have valid latitude and longitude for currentLocation', () => {
      const location = {
        lat: 40.7128,
        lng: -74.0060
      };

      expect(location.lat).toBeGreaterThanOrEqual(-90);
      expect(location.lat).toBeLessThanOrEqual(90);
      expect(location.lng).toBeGreaterThanOrEqual(-180);
      expect(location.lng).toBeLessThanOrEqual(180);
    });

    it('should have ISO 8601 timestamp format for lastUpdated', () => {
      const timestamp = '2024-01-01T12:30:45.123Z';
      const date = new Date(timestamp);
      
      expect(date.toISOString()).toBe(timestamp);
    });
  });

  describe('Route interface', () => {
    it('should accept valid route object with all required fields', () => {
      const route: Route = {
        id: 'route-456',
        startLocation: {
          lat: 40.7128,
          lng: -74.0060
        },
        destination: {
          lat: 40.7589,
          lng: -73.9851
        },
        path: [
          { lat: 40.7128, lng: -74.0060 },
          { lat: 40.7589, lng: -73.9851 }
        ],
        totalDistance: 4.5,
        estimatedTime: 12
      };

      expect(route.id).toBe('route-456');
      expect(route.totalDistance).toBe(4.5);
      expect(route.estimatedTime).toBe(12);
      expect(route.path).toHaveLength(2);
    });

    it('should have valid coordinates in path array', () => {
      const path = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7300, lng: -74.0000 },
        { lat: 40.7589, lng: -73.9851 }
      ];

      path.forEach(coord => {
        expect(coord.lat).toBeGreaterThanOrEqual(-90);
        expect(coord.lat).toBeLessThanOrEqual(90);
        expect(coord.lng).toBeGreaterThanOrEqual(-180);
        expect(coord.lng).toBeLessThanOrEqual(180);
      });
    });

    it('should have positive distance and time values', () => {
      const route: Route = {
        id: 'route-789',
        startLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        path: [],
        totalDistance: 3.8,
        estimatedTime: 10
      };

      expect(route.totalDistance).toBeGreaterThan(0);
      expect(route.estimatedTime).toBeGreaterThan(0);
    });
  });
});
