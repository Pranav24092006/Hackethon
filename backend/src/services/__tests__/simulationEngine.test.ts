/**
 * Unit tests for Simulation Engine Service
 * 
 * Tests GPS path generation, traffic data generation, hospital data,
 * and simulation mode toggling.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import {
  generateGPSPath,
  generateTrafficData,
  getSampleHospitals,
  setSimulationMode,
  isSimulationMode,
  startPeriodicGPSUpdates,
  stopPeriodicGPSUpdates,
  stopAllGPSUpdates,
  getActiveGPSUpdateCount
} from '../simulationEngine.js';

describe('SimulationEngine', () => {
  beforeEach(() => {
    // Reset simulation mode before each test
    setSimulationMode(false);
    stopAllGPSUpdates();
  });

  afterEach(() => {
    // Clean up after each test
    stopAllGPSUpdates();
  });

  describe('generateGPSPath', () => {
    it('should generate path with correct number of steps', () => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };
      const steps = 10;

      const path = generateGPSPath(start, end, steps);

      expect(path).toHaveLength(steps);
    });

    it('should start at the starting coordinates (with noise)', () => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };
      const steps = 10;

      const path = generateGPSPath(start, end, steps);

      // First point should be close to start (within noise range of ±0.001)
      expect(path[0].lat).toBeCloseTo(start.lat, 2);
      expect(path[0].lng).toBeCloseTo(start.lng, 2);
    });

    it('should end at the ending coordinates (with noise)', () => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };
      const steps = 10;

      const path = generateGPSPath(start, end, steps);

      // Last point should be close to end (within noise range of ±0.001)
      expect(path[steps - 1].lat).toBeCloseTo(end.lat, 2);
      expect(path[steps - 1].lng).toBeCloseTo(end.lng, 2);
    });

    it('should generate intermediate points between start and end', () => {
      const start = { lat: 40.0, lng: -74.0 };
      const end = { lat: 41.0, lng: -73.0 };
      const steps = 5;

      const path = generateGPSPath(start, end, steps);

      // Check that intermediate points are between start and end
      for (let i = 1; i < steps - 1; i++) {
        expect(path[i].lat).toBeGreaterThan(start.lat - 0.1);
        expect(path[i].lat).toBeLessThan(end.lat + 0.1);
        expect(path[i].lng).toBeGreaterThan(end.lng - 0.1);
        expect(path[i].lng).toBeLessThan(start.lng + 0.1);
      }
    });

    it('should add random noise to coordinates', () => {
      const start = { lat: 40.0, lng: -74.0 };
      const end = { lat: 40.0, lng: -74.0 }; // Same start and end
      const steps = 10;

      const path = generateGPSPath(start, end, steps);

      // With noise, not all points should be exactly the same
      const uniquePoints = new Set(path.map(p => `${p.lat},${p.lng}`));
      expect(uniquePoints.size).toBeGreaterThan(1);
    });

    it('should throw error for invalid steps', () => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };

      expect(() => generateGPSPath(start, end, 1)).toThrow('Steps must be at least 2');
      expect(() => generateGPSPath(start, end, 0)).toThrow('Steps must be at least 2');
    });

    it('should handle same start and end coordinates', () => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7128, lng: -74.0060 };
      const steps = 5;

      const path = generateGPSPath(start, end, steps);

      expect(path).toHaveLength(steps);
      // All points should be close to the same location (within noise)
      path.forEach(point => {
        expect(point.lat).toBeCloseTo(start.lat, 2);
        expect(point.lng).toBeCloseTo(start.lng, 2);
      });
    });
  });

  describe('generateTrafficData', () => {
    it('should generate congestion data for all road segments', () => {
      const roadNetwork = {
        nodes: new Map([
          ['node1', { id: 'node1', coordinates: { lat: 40.7128, lng: -74.0060 } }],
          ['node2', { id: 'node2', coordinates: { lat: 40.7580, lng: -73.9855 } }]
        ]),
        edges: new Map([
          ['node1', [
            { from: 'node1', to: 'node2', distance: 5.2, congestionWeight: 1.0 },
            { from: 'node1', to: 'node3', distance: 3.1, congestionWeight: 1.0 }
          ]],
          ['node2', [
            { from: 'node2', to: 'node3', distance: 2.8, congestionWeight: 1.0 }
          ]]
        ])
      };

      const trafficData = generateTrafficData(roadNetwork);

      // Should generate data for all edges (3 total)
      expect(trafficData).toHaveLength(3);
    });

    it('should generate density values between 0 and 1', () => {
      const roadNetwork = {
        nodes: new Map(),
        edges: new Map([
          ['node1', [
            { from: 'node1', to: 'node2', distance: 5.2, congestionWeight: 1.0 }
          ]]
        ])
      };

      const trafficData = generateTrafficData(roadNetwork);

      trafficData.forEach(data => {
        expect(data.density).toBeGreaterThanOrEqual(0);
        expect(data.density).toBeLessThanOrEqual(1);
      });
    });

    it('should follow distribution: 60% green, 30% orange, 10% red', () => {
      const roadNetwork = {
        nodes: new Map(),
        edges: new Map([
          ['node1', Array(1000).fill(null).map((_, i) => ({
            from: 'node1',
            to: `node${i}`,
            distance: 1.0,
            congestionWeight: 1.0
          }))]
        ])
      };

      const trafficData = generateTrafficData(roadNetwork);

      let greenCount = 0;
      let orangeCount = 0;
      let redCount = 0;

      trafficData.forEach(data => {
        if (data.density < 0.3) greenCount++;
        else if (data.density < 0.7) orangeCount++;
        else redCount++;
      });

      const total = trafficData.length;
      const greenPercent = greenCount / total;
      const orangePercent = orangeCount / total;
      const redPercent = redCount / total;

      // Allow 10% margin of error
      expect(greenPercent).toBeGreaterThan(0.5);
      expect(greenPercent).toBeLessThan(0.7);
      expect(orangePercent).toBeGreaterThan(0.2);
      expect(orangePercent).toBeLessThan(0.4);
      expect(redPercent).toBeGreaterThan(0.05);
      expect(redPercent).toBeLessThan(0.15);
    });

    it('should include timestamp in ISO 8601 format', () => {
      const roadNetwork = {
        nodes: new Map(),
        edges: new Map([
          ['node1', [
            { from: 'node1', to: 'node2', distance: 5.2, congestionWeight: 1.0 }
          ]]
        ])
      };

      const trafficData = generateTrafficData(roadNetwork);

      trafficData.forEach(data => {
        expect(data.timestamp).toBeDefined();
        expect(typeof data.timestamp).toBe('string');
        // Check if it's a valid ISO 8601 timestamp
        expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
      });
    });

    it('should generate unique segment IDs', () => {
      const roadNetwork = {
        nodes: new Map(),
        edges: new Map([
          ['node1', [
            { from: 'node1', to: 'node2', distance: 5.2, congestionWeight: 1.0 },
            { from: 'node1', to: 'node3', distance: 3.1, congestionWeight: 1.0 }
          ]]
        ])
      };

      const trafficData = generateTrafficData(roadNetwork);

      const segmentIds = trafficData.map(d => d.segmentId);
      const uniqueIds = new Set(segmentIds);

      expect(uniqueIds.size).toBe(segmentIds.length);
    });

    it('should handle empty road network', () => {
      const roadNetwork = {
        nodes: new Map(),
        edges: new Map()
      };

      const trafficData = generateTrafficData(roadNetwork);

      expect(trafficData).toHaveLength(0);
    });
  });

  describe('getSampleHospitals', () => {
    it('should return 5-10 sample hospitals', () => {
      const hospitals = getSampleHospitals();

      expect(hospitals.length).toBeGreaterThanOrEqual(5);
      expect(hospitals.length).toBeLessThanOrEqual(10);
    });

    it('should return hospitals with all required fields', () => {
      const hospitals = getSampleHospitals();

      hospitals.forEach(hospital => {
        expect(hospital.id).toBeDefined();
        expect(hospital.name).toBeDefined();
        expect(hospital.location).toBeDefined();
        expect(hospital.location.lat).toBeDefined();
        expect(hospital.location.lng).toBeDefined();
        expect(hospital.address).toBeDefined();
        expect(hospital.capacity).toBeDefined();
        expect(typeof hospital.emergencyCapable).toBe('boolean');
        expect(hospital.phoneNumber).toBeDefined();
      });
    });

    it('should return hospitals with valid coordinates', () => {
      const hospitals = getSampleHospitals();

      hospitals.forEach(hospital => {
        expect(hospital.location.lat).toBeGreaterThan(-90);
        expect(hospital.location.lat).toBeLessThan(90);
        expect(hospital.location.lng).toBeGreaterThan(-180);
        expect(hospital.location.lng).toBeLessThan(180);
      });
    });

    it('should return hospitals with positive capacity', () => {
      const hospitals = getSampleHospitals();

      hospitals.forEach(hospital => {
        expect(hospital.capacity).toBeGreaterThan(0);
      });
    });

    it('should return hospitals with unique IDs', () => {
      const hospitals = getSampleHospitals();

      const ids = hospitals.map(h => h.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should return consistent data on multiple calls', () => {
      const hospitals1 = getSampleHospitals();
      const hospitals2 = getSampleHospitals();

      expect(hospitals1).toEqual(hospitals2);
    });
  });

  describe('Simulation Mode', () => {
    it('should start with simulation mode disabled', () => {
      expect(isSimulationMode()).toBe(false);
    });

    it('should enable simulation mode', () => {
      setSimulationMode(true);
      expect(isSimulationMode()).toBe(true);
    });

    it('should disable simulation mode', () => {
      setSimulationMode(true);
      expect(isSimulationMode()).toBe(true);

      setSimulationMode(false);
      expect(isSimulationMode()).toBe(false);
    });

    it('should toggle simulation mode multiple times', () => {
      setSimulationMode(true);
      expect(isSimulationMode()).toBe(true);

      setSimulationMode(false);
      expect(isSimulationMode()).toBe(false);

      setSimulationMode(true);
      expect(isSimulationMode()).toBe(true);
    });
  });

  describe('Periodic GPS Updates', () => {
    it('should start periodic GPS updates', (done) => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };
      const userId = 'test-user-1';
      let updateCount = 0;

      const callback = (location: any) => {
        updateCount++;
        expect(location.lat).toBeDefined();
        expect(location.lng).toBeDefined();

        if (updateCount === 3) {
          stopPeriodicGPSUpdates(userId);
          done();
        }
      };

      startPeriodicGPSUpdates(userId, start, end, callback);
    }, 10000);

    it('should stop periodic GPS updates', (done) => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };
      const userId = 'test-user-2';
      let updateCount = 0;

      const callback = (location: any) => {
        updateCount++;
      };

      startPeriodicGPSUpdates(userId, start, end, callback);

      setTimeout(() => {
        stopPeriodicGPSUpdates(userId);
        const countAtStop = updateCount;

        setTimeout(() => {
          // Count should not increase after stop
          expect(updateCount).toBe(countAtStop);
          done();
        }, 3000);
      }, 3000);
    }, 10000);

    it('should track active GPS update count', () => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };

      expect(getActiveGPSUpdateCount()).toBe(0);

      startPeriodicGPSUpdates('user1', start, end, () => {});
      expect(getActiveGPSUpdateCount()).toBe(1);

      startPeriodicGPSUpdates('user2', start, end, () => {});
      expect(getActiveGPSUpdateCount()).toBe(2);

      stopPeriodicGPSUpdates('user1');
      expect(getActiveGPSUpdateCount()).toBe(1);

      stopAllGPSUpdates();
      expect(getActiveGPSUpdateCount()).toBe(0);
    });

    it('should replace existing interval for same user', () => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };
      const userId = 'test-user-3';

      startPeriodicGPSUpdates(userId, start, end, () => {});
      expect(getActiveGPSUpdateCount()).toBe(1);

      startPeriodicGPSUpdates(userId, start, end, () => {});
      expect(getActiveGPSUpdateCount()).toBe(1);

      stopAllGPSUpdates();
    });

    it('should stop all GPS updates', () => {
      const start = { lat: 40.7128, lng: -74.0060 };
      const end = { lat: 40.7580, lng: -73.9855 };

      startPeriodicGPSUpdates('user1', start, end, () => {});
      startPeriodicGPSUpdates('user2', start, end, () => {});
      startPeriodicGPSUpdates('user3', start, end, () => {});

      expect(getActiveGPSUpdateCount()).toBe(3);

      stopAllGPSUpdates();
      expect(getActiveGPSUpdateCount()).toBe(0);
    });
  });
});
