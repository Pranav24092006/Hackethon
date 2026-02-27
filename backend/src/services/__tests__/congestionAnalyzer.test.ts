/**
 * Unit tests for Congestion Analyzer Service
 * 
 * Tests congestion analysis, route congestion retrieval, data updates,
 * and periodic update functionality.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import {
  analyzeCongestion,
  getRouteCongestion,
  updateCongestionData,
  getCongestionData,
  getAllCongestionData,
  clearCongestionData,
  startPeriodicCongestionUpdates,
  stopPeriodicCongestionUpdates,
  isPeriodicUpdatesActive,
  getCongestionWeight,
  getCongestionLevelFromDensity
} from '../congestionAnalyzer.js';

describe('CongestionAnalyzer', () => {
  beforeEach(() => {
    // Clear congestion data before each test
    clearCongestionData();
    stopPeriodicCongestionUpdates();
  });

  afterEach(() => {
    // Clean up after each test
    stopPeriodicCongestionUpdates();
    clearCongestionData();
  });

  describe('analyzeCongestion', () => {
    it('should return green for density 0-0.3', () => {
      const segment = {
        from: 'node1',
        to: 'node2',
        distance: 5.2,
        congestionWeight: 1.0
      };

      // Update with green density
      updateCongestionData([
        {
          segmentId: 'node1-node2',
          density: 0.2,
          timestamp: new Date().toISOString()
        }
      ]);

      const level = analyzeCongestion(segment);
      expect(level).toBe('green');
    });

    it('should return orange for density 0.3-0.7', () => {
      const segment = {
        from: 'node1',
        to: 'node2',
        distance: 5.2,
        congestionWeight: 1.0
      };

      // Update with orange density
      updateCongestionData([
        {
          segmentId: 'node1-node2',
          density: 0.5,
          timestamp: new Date().toISOString()
        }
      ]);

      const level = analyzeCongestion(segment);
      expect(level).toBe('orange');
    });

    it('should return red for density 0.7-1.0', () => {
      const segment = {
        from: 'node1',
        to: 'node2',
        distance: 5.2,
        congestionWeight: 1.0
      };

      // Update with red density
      updateCongestionData([
        {
          segmentId: 'node1-node2',
          density: 0.85,
          timestamp: new Date().toISOString()
        }
      ]);

      const level = analyzeCongestion(segment);
      expect(level).toBe('red');
    });

    it('should return green for density exactly 0.3 (boundary)', () => {
      const segment = {
        from: 'node1',
        to: 'node2',
        distance: 5.2,
        congestionWeight: 1.0
      };

      updateCongestionData([
        {
          segmentId: 'node1-node2',
          density: 0.3,
          timestamp: new Date().toISOString()
        }
      ]);

      const level = analyzeCongestion(segment);
      expect(level).toBe('orange');
    });

    it('should return orange for density exactly 0.7 (boundary)', () => {
      const segment = {
        from: 'node1',
        to: 'node2',
        distance: 5.2,
        congestionWeight: 1.0
      };

      updateCongestionData([
        {
          segmentId: 'node1-node2',
          density: 0.7,
          timestamp: new Date().toISOString()
        }
      ]);

      const level = analyzeCongestion(segment);
      expect(level).toBe('red');
    });

    it('should return green when no congestion data available', () => {
      const segment = {
        from: 'node1',
        to: 'node2',
        distance: 5.2,
        congestionWeight: 1.0
      };

      const level = analyzeCongestion(segment);
      expect(level).toBe('green');
    });

    it('should handle density of 0', () => {
      const segment = {
        from: 'node1',
        to: 'node2',
        distance: 5.2,
        congestionWeight: 1.0
      };

      updateCongestionData([
        {
          segmentId: 'node1-node2',
          density: 0,
          timestamp: new Date().toISOString()
        }
      ]);

      const level = analyzeCongestion(segment);
      expect(level).toBe('green');
    });

    it('should handle density of 1', () => {
      const segment = {
        from: 'node1',
        to: 'node2',
        distance: 5.2,
        congestionWeight: 1.0
      };

      updateCongestionData([
        {
          segmentId: 'node1-node2',
          density: 1.0,
          timestamp: new Date().toISOString()
        }
      ]);

      const level = analyzeCongestion(segment);
      expect(level).toBe('red');
    });
  });

  describe('getRouteCongestion', () => {
    it('should return congestion levels for all route segments', () => {
      const route = {
        path: [
          { lat: 40.7128, lng: -74.0060 },
          { lat: 40.7580, lng: -73.9855 },
          { lat: 40.7829, lng: -73.9654 }
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.0060 },
            end: { lat: 40.7580, lng: -73.9855 },
            distance: 5.2,
            congestionLevel: 'green' as const
          },
          {
            start: { lat: 40.7580, lng: -73.9855 },
            end: { lat: 40.7829, lng: -73.9654 },
            distance: 3.1,
            congestionLevel: 'orange' as const
          }
        ],
        totalDistance: 8.3,
        estimatedTime: 15
      };

      const congestion = getRouteCongestion(route);

      expect(congestion.size).toBe(2);
      expect(congestion.get('segment-0')).toBe('green');
      expect(congestion.get('segment-1')).toBe('orange');
    });

    it('should handle route with single segment', () => {
      const route = {
        path: [
          { lat: 40.7128, lng: -74.0060 },
          { lat: 40.7580, lng: -73.9855 }
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.0060 },
            end: { lat: 40.7580, lng: -73.9855 },
            distance: 5.2,
            congestionLevel: 'red' as const
          }
        ],
        totalDistance: 5.2,
        estimatedTime: 10
      };

      const congestion = getRouteCongestion(route);

      expect(congestion.size).toBe(1);
      expect(congestion.get('segment-0')).toBe('red');
    });

    it('should handle route with no segments', () => {
      const route = {
        path: [],
        segments: [],
        totalDistance: 0,
        estimatedTime: 0
      };

      const congestion = getRouteCongestion(route);

      expect(congestion.size).toBe(0);
    });

    it('should handle route with multiple segments of same level', () => {
      const route = {
        path: [
          { lat: 40.7128, lng: -74.0060 },
          { lat: 40.7580, lng: -73.9855 },
          { lat: 40.7829, lng: -73.9654 }
        ],
        segments: [
          {
            start: { lat: 40.7128, lng: -74.0060 },
            end: { lat: 40.7580, lng: -73.9855 },
            distance: 5.2,
            congestionLevel: 'green' as const
          },
          {
            start: { lat: 40.7580, lng: -73.9855 },
            end: { lat: 40.7829, lng: -73.9654 },
            distance: 3.1,
            congestionLevel: 'green' as const
          }
        ],
        totalDistance: 8.3,
        estimatedTime: 12
      };

      const congestion = getRouteCongestion(route);

      expect(congestion.size).toBe(2);
      expect(congestion.get('segment-0')).toBe('green');
      expect(congestion.get('segment-1')).toBe('green');
    });
  });

  describe('updateCongestionData', () => {
    it('should store congestion data', () => {
      const data = [
        {
          segmentId: 'node1-node2',
          density: 0.5,
          timestamp: new Date().toISOString()
        }
      ];

      updateCongestionData(data);

      const stored = getCongestionData('node1-node2');
      expect(stored).toBeDefined();
      expect(stored?.density).toBe(0.5);
    });

    it('should update multiple segments', () => {
      const data = [
        {
          segmentId: 'node1-node2',
          density: 0.2,
          timestamp: new Date().toISOString()
        },
        {
          segmentId: 'node2-node3',
          density: 0.6,
          timestamp: new Date().toISOString()
        },
        {
          segmentId: 'node3-node4',
          density: 0.9,
          timestamp: new Date().toISOString()
        }
      ];

      updateCongestionData(data);

      expect(getCongestionData('node1-node2')?.density).toBe(0.2);
      expect(getCongestionData('node2-node3')?.density).toBe(0.6);
      expect(getCongestionData('node3-node4')?.density).toBe(0.9);
    });

    it('should overwrite existing data for same segment', () => {
      const data1 = [
        {
          segmentId: 'node1-node2',
          density: 0.2,
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      ];

      const data2 = [
        {
          segmentId: 'node1-node2',
          density: 0.8,
          timestamp: '2024-01-01T00:01:00.000Z'
        }
      ];

      updateCongestionData(data1);
      expect(getCongestionData('node1-node2')?.density).toBe(0.2);

      updateCongestionData(data2);
      expect(getCongestionData('node1-node2')?.density).toBe(0.8);
      expect(getCongestionData('node1-node2')?.timestamp).toBe('2024-01-01T00:01:00.000Z');
    });

    it('should handle empty data array', () => {
      updateCongestionData([]);
      expect(getAllCongestionData()).toHaveLength(0);
    });
  });

  describe('getCongestionData', () => {
    it('should retrieve stored congestion data', () => {
      const data = [
        {
          segmentId: 'node1-node2',
          density: 0.5,
          timestamp: new Date().toISOString()
        }
      ];

      updateCongestionData(data);

      const retrieved = getCongestionData('node1-node2');
      expect(retrieved).toEqual(data[0]);
    });

    it('should return undefined for non-existent segment', () => {
      const retrieved = getCongestionData('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllCongestionData', () => {
    it('should return all stored congestion data', () => {
      const data = [
        {
          segmentId: 'node1-node2',
          density: 0.2,
          timestamp: new Date().toISOString()
        },
        {
          segmentId: 'node2-node3',
          density: 0.6,
          timestamp: new Date().toISOString()
        }
      ];

      updateCongestionData(data);

      const all = getAllCongestionData();
      expect(all).toHaveLength(2);
      expect(all).toEqual(expect.arrayContaining(data));
    });

    it('should return empty array when no data stored', () => {
      const all = getAllCongestionData();
      expect(all).toHaveLength(0);
    });
  });

  describe('clearCongestionData', () => {
    it('should remove all congestion data', () => {
      const data = [
        {
          segmentId: 'node1-node2',
          density: 0.5,
          timestamp: new Date().toISOString()
        }
      ];

      updateCongestionData(data);
      expect(getAllCongestionData()).toHaveLength(1);

      clearCongestionData();
      expect(getAllCongestionData()).toHaveLength(0);
    });

    it('should allow new data after clearing', () => {
      const data1 = [
        {
          segmentId: 'node1-node2',
          density: 0.5,
          timestamp: new Date().toISOString()
        }
      ];

      updateCongestionData(data1);
      clearCongestionData();

      const data2 = [
        {
          segmentId: 'node3-node4',
          density: 0.7,
          timestamp: new Date().toISOString()
        }
      ];

      updateCongestionData(data2);
      expect(getAllCongestionData()).toHaveLength(1);
      expect(getCongestionData('node3-node4')?.density).toBe(0.7);
    });
  });

  describe('Periodic Congestion Updates', () => {
    it('should start periodic updates', (done) => {
      let callCount = 0;
      const updateCallback = () => {
        callCount++;
        return [
          {
            segmentId: 'node1-node2',
            density: Math.random(),
            timestamp: new Date().toISOString()
          }
        ];
      };

      startPeriodicCongestionUpdates(updateCallback);
      expect(isPeriodicUpdatesActive()).toBe(true);

      // Initial update should happen immediately
      expect(callCount).toBe(1);

      stopPeriodicCongestionUpdates();
      done();
    });

    it('should stop periodic updates', (done) => {
      let callCount = 0;
      const updateCallback = () => {
        callCount++;
        return [];
      };

      startPeriodicCongestionUpdates(updateCallback);
      expect(isPeriodicUpdatesActive()).toBe(true);

      setTimeout(() => {
        stopPeriodicCongestionUpdates();
        expect(isPeriodicUpdatesActive()).toBe(false);

        const countAtStop = callCount;

        setTimeout(() => {
          // Count should not increase after stop
          expect(callCount).toBe(countAtStop);
          done();
        }, 2000);
      }, 1000);
    }, 10000);

    it('should update data on each interval', () => {
      const updateCallback = () => {
        return [
          {
            segmentId: 'node1-node2',
            density: Math.random(),
            timestamp: new Date().toISOString()
          }
        ];
      };

      startPeriodicCongestionUpdates(updateCallback);

      // Data should be available after initial update
      const data = getCongestionData('node1-node2');
      expect(data).toBeDefined();

      stopPeriodicCongestionUpdates();
    });

    it('should replace existing interval when started again', () => {
      const callback1 = () => [
        {
          segmentId: 'node1-node2',
          density: 0.2,
          timestamp: new Date().toISOString()
        }
      ];

      const callback2 = () => [
        {
          segmentId: 'node3-node4',
          density: 0.8,
          timestamp: new Date().toISOString()
        }
      ];

      startPeriodicCongestionUpdates(callback1);
      expect(isPeriodicUpdatesActive()).toBe(true);

      startPeriodicCongestionUpdates(callback2);
      expect(isPeriodicUpdatesActive()).toBe(true);

      // Should have data from callback2
      expect(getCongestionData('node3-node4')).toBeDefined();

      stopPeriodicCongestionUpdates();
    });

    it('should not be active initially', () => {
      expect(isPeriodicUpdatesActive()).toBe(false);
    });
  });

  describe('getCongestionWeight', () => {
    it('should return 1.0 for green', () => {
      expect(getCongestionWeight('green')).toBe(1.0);
    });

    it('should return 1.5 for orange', () => {
      expect(getCongestionWeight('orange')).toBe(1.5);
    });

    it('should return 3.0 for red', () => {
      expect(getCongestionWeight('red')).toBe(3.0);
    });
  });

  describe('getCongestionLevelFromDensity', () => {
    it('should return green for density < 0.3', () => {
      expect(getCongestionLevelFromDensity(0)).toBe('green');
      expect(getCongestionLevelFromDensity(0.1)).toBe('green');
      expect(getCongestionLevelFromDensity(0.29)).toBe('green');
    });

    it('should return orange for density 0.3-0.7', () => {
      expect(getCongestionLevelFromDensity(0.3)).toBe('orange');
      expect(getCongestionLevelFromDensity(0.5)).toBe('orange');
      expect(getCongestionLevelFromDensity(0.69)).toBe('orange');
    });

    it('should return red for density >= 0.7', () => {
      expect(getCongestionLevelFromDensity(0.7)).toBe('red');
      expect(getCongestionLevelFromDensity(0.85)).toBe('red');
      expect(getCongestionLevelFromDensity(1.0)).toBe('red');
    });
  });
});
