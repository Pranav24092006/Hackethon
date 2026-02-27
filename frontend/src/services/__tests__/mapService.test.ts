import L from 'leaflet';
import {
  initializeMap,
  addMarker,
  updateMarker,
  drawRoute,
  colorCodeRoute,
  clearRoutes,
  removeMarker,
  fitBounds,
  startLocationTracking,
  updateTrackedLocation,
  stopLocationTracking,
  handleGPSCoordinates,
  calculateDistance,
  isSignificantLocationChange,
  centerMapOnLocation,
  Coordinates,
  RouteSegment,
  LocationTracker,
} from '../mapService';

// Mock Leaflet
jest.mock('leaflet', () => {
  const mockMarker = {
    setLatLng: jest.fn(),
    addTo: jest.fn().mockReturnThis(),
  };

  const mockPolyline = {
    addTo: jest.fn().mockReturnThis(),
  };

  const mockTileLayer = {
    addTo: jest.fn().mockReturnThis(),
  };

  const mockMap = {
    setView: jest.fn().mockReturnThis(),
    eachLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn(),
  };

  return {
    map: jest.fn(() => mockMap),
    tileLayer: jest.fn(() => mockTileLayer),
    marker: jest.fn(() => mockMarker),
    polyline: jest.fn(() => mockPolyline),
    divIcon: jest.fn((config) => config),
    latLngBounds: jest.fn((coords) => ({
      coords,
    })),
    Map: jest.fn(),
    Marker: jest.fn(),
    Polyline: jest.fn(),
  };
});

describe('MapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initializeMap', () => {
    it('should create a map with the specified container, center, and zoom', () => {
      const containerId = 'map-container';
      const center: Coordinates = { lat: 40.7128, lng: -74.006 };
      const zoom = 13;

      const map = initializeMap(containerId, center, zoom);

      expect(L.map).toHaveBeenCalledWith(containerId);
      expect(map.setView).toHaveBeenCalledWith([center.lat, center.lng], zoom);
    });

    it('should use default zoom level of 13 when not specified', () => {
      const containerId = 'map-container';
      const center: Coordinates = { lat: 40.7128, lng: -74.006 };

      const map = initializeMap(containerId, center);

      expect(map.setView).toHaveBeenCalledWith([center.lat, center.lng], 13);
    });

    it('should add OpenStreetMap tile layer with correct attribution', () => {
      const containerId = 'map-container';
      const center: Coordinates = { lat: 40.7128, lng: -74.006 };

      initializeMap(containerId, center);

      expect(L.tileLayer).toHaveBeenCalledWith(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        expect.objectContaining({
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 3,
        })
      );
    });
  });

  describe('addMarker', () => {
    it('should add an ambulance marker at the specified coordinates', () => {
      const mockMap = L.map('test') as any;
      const coordinates: Coordinates = { lat: 40.7128, lng: -74.006 };

      const marker = addMarker(mockMap, coordinates, 'ambulance');

      expect(L.marker).toHaveBeenCalledWith(
        [coordinates.lat, coordinates.lng],
        expect.objectContaining({
          icon: expect.any(Object),
        })
      );
      expect(marker.addTo).toHaveBeenCalledWith(mockMap);
    });

    it('should add a police marker at the specified coordinates', () => {
      const mockMap = L.map('test') as any;
      const coordinates: Coordinates = { lat: 40.7128, lng: -74.006 };

      const marker = addMarker(mockMap, coordinates, 'police');

      expect(L.marker).toHaveBeenCalledWith(
        [coordinates.lat, coordinates.lng],
        expect.objectContaining({
          icon: expect.any(Object),
        })
      );
      expect(marker.addTo).toHaveBeenCalledWith(mockMap);
    });

    it('should add a hospital marker at the specified coordinates', () => {
      const mockMap = L.map('test') as any;
      const coordinates: Coordinates = { lat: 40.7128, lng: -74.006 };

      const marker = addMarker(mockMap, coordinates, 'hospital');

      expect(L.marker).toHaveBeenCalledWith(
        [coordinates.lat, coordinates.lng],
        expect.objectContaining({
          icon: expect.any(Object),
        })
      );
      expect(marker.addTo).toHaveBeenCalledWith(mockMap);
    });

    it('should add a congestion marker at the specified coordinates', () => {
      const mockMap = L.map('test') as any;
      const coordinates: Coordinates = { lat: 40.7128, lng: -74.006 };

      const marker = addMarker(mockMap, coordinates, 'congestion');

      expect(L.marker).toHaveBeenCalledWith(
        [coordinates.lat, coordinates.lng],
        expect.objectContaining({
          icon: expect.any(Object),
        })
      );
      expect(marker.addTo).toHaveBeenCalledWith(mockMap);
    });
  });

  describe('updateMarker', () => {
    it('should update marker position to new coordinates', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };
      const newCoords: Coordinates = { lat: 40.7589, lng: -73.9851 };

      const marker = addMarker(mockMap, initialCoords, 'ambulance');
      updateMarker(marker, newCoords);

      expect(marker.setLatLng).toHaveBeenCalledWith([newCoords.lat, newCoords.lng]);
    });

    it('should handle multiple position updates', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };
      const marker = addMarker(mockMap, initialCoords, 'ambulance');

      const updates = [
        { lat: 40.7589, lng: -73.9851 },
        { lat: 40.7614, lng: -73.9776 },
        { lat: 40.7489, lng: -73.9680 },
      ];

      updates.forEach((coords) => {
        updateMarker(marker, coords);
      });

      expect(marker.setLatLng).toHaveBeenCalledTimes(3);
      expect(marker.setLatLng).toHaveBeenLastCalledWith([
        updates[2].lat,
        updates[2].lng,
      ]);
    });
  });

  describe('drawRoute', () => {
    it('should draw a route with default blue color', () => {
      const mockMap = L.map('test') as any;
      const path: Coordinates[] = [
        { lat: 40.7128, lng: -74.006 },
        { lat: 40.7589, lng: -73.9851 },
        { lat: 40.7614, lng: -73.9776 },
      ];

      const polyline = drawRoute(mockMap, path);

      expect(L.polyline).toHaveBeenCalledWith(
        path.map((c) => [c.lat, c.lng]),
        expect.objectContaining({
          color: '#3b82f6',
          weight: 5,
          opacity: 0.7,
        })
      );
      expect(polyline.addTo).toHaveBeenCalledWith(mockMap);
    });

    it('should draw a route with custom color', () => {
      const mockMap = L.map('test') as any;
      const path: Coordinates[] = [
        { lat: 40.7128, lng: -74.006 },
        { lat: 40.7589, lng: -73.9851 },
      ];
      const customColor = '#ff0000';

      drawRoute(mockMap, path, customColor);

      expect(L.polyline).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          color: customColor,
        })
      );
    });

    it('should handle empty path array', () => {
      const mockMap = L.map('test') as any;
      const path: Coordinates[] = [];

      const polyline = drawRoute(mockMap, path);

      expect(L.polyline).toHaveBeenCalledWith([], expect.any(Object));
      expect(polyline.addTo).toHaveBeenCalledWith(mockMap);
    });
  });

  describe('colorCodeRoute', () => {
    it('should draw segments with correct congestion colors', () => {
      const mockMap = L.map('test') as any;
      const segments: RouteSegment[] = [
        {
          start: { lat: 40.7128, lng: -74.006 },
          end: { lat: 40.7589, lng: -73.9851 },
          congestionLevel: 'green',
        },
        {
          start: { lat: 40.7589, lng: -73.9851 },
          end: { lat: 40.7614, lng: -73.9776 },
          congestionLevel: 'orange',
        },
        {
          start: { lat: 40.7614, lng: -73.9776 },
          end: { lat: 40.7489, lng: -73.9680 },
          congestionLevel: 'red',
        },
      ];

      const polylines = colorCodeRoute(mockMap, segments);

      expect(polylines).toHaveLength(3);
      expect(L.polyline).toHaveBeenCalledTimes(3);

      // Check green segment
      expect(L.polyline).toHaveBeenNthCalledWith(
        1,
        expect.any(Array),
        expect.objectContaining({
          color: '#10b981',
          weight: 6,
          opacity: 0.8,
        })
      );

      // Check orange segment
      expect(L.polyline).toHaveBeenNthCalledWith(
        2,
        expect.any(Array),
        expect.objectContaining({
          color: '#f59e0b',
        })
      );

      // Check red segment
      expect(L.polyline).toHaveBeenNthCalledWith(
        3,
        expect.any(Array),
        expect.objectContaining({
          color: '#ef4444',
        })
      );
    });

    it('should handle empty segments array', () => {
      const mockMap = L.map('test') as any;
      const segments: RouteSegment[] = [];

      const polylines = colorCodeRoute(mockMap, segments);

      expect(polylines).toHaveLength(0);
      expect(L.polyline).not.toHaveBeenCalled();
    });

    it('should handle single segment', () => {
      const mockMap = L.map('test') as any;
      const segments: RouteSegment[] = [
        {
          start: { lat: 40.7128, lng: -74.006 },
          end: { lat: 40.7589, lng: -73.9851 },
          congestionLevel: 'green',
        },
      ];

      const polylines = colorCodeRoute(mockMap, segments);

      expect(polylines).toHaveLength(1);
      expect(L.polyline).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearRoutes', () => {
    it('should remove all polylines from the map', () => {
      const mockPolyline1 = new L.Polyline([]);
      const mockPolyline2 = new L.Polyline([]);
      const mockMarker = new L.Marker([0, 0]);

      const mockMap = {
        eachLayer: jest.fn((callback) => {
          callback(mockPolyline1);
          callback(mockPolyline2);
          callback(mockMarker);
        }),
        removeLayer: jest.fn(),
      } as any;

      clearRoutes(mockMap);

      expect(mockMap.removeLayer).toHaveBeenCalledWith(mockPolyline1);
      expect(mockMap.removeLayer).toHaveBeenCalledWith(mockPolyline2);
      expect(mockMap.removeLayer).not.toHaveBeenCalledWith(mockMarker);
    });

    it('should handle map with no layers', () => {
      const mockMap = {
        eachLayer: jest.fn((callback) => {
          // No layers
        }),
        removeLayer: jest.fn(),
      } as any;

      clearRoutes(mockMap);

      expect(mockMap.removeLayer).not.toHaveBeenCalled();
    });
  });

  describe('removeMarker', () => {
    it('should remove a marker from the map', () => {
      const mockMap = {
        removeLayer: jest.fn(),
      } as any;

      const mockMarker = new L.Marker([0, 0]) as any;

      removeMarker(mockMap, mockMarker);

      expect(mockMap.removeLayer).toHaveBeenCalledWith(mockMarker);
    });
  });

  describe('fitBounds', () => {
    it('should fit map bounds to show all coordinates', () => {
      const mockMap = {
        fitBounds: jest.fn(),
      } as any;

      const coordinates: Coordinates[] = [
        { lat: 40.7128, lng: -74.006 },
        { lat: 40.7589, lng: -73.9851 },
        { lat: 40.7614, lng: -73.9776 },
      ];

      fitBounds(mockMap, coordinates);

      expect(L.latLngBounds).toHaveBeenCalledWith(
        coordinates.map((c) => [c.lat, c.lng])
      );
      expect(mockMap.fitBounds).toHaveBeenCalledWith(
        expect.any(Object),
        { padding: [50, 50] }
      );
    });

    it('should handle empty coordinates array', () => {
      const mockMap = {
        fitBounds: jest.fn(),
      } as any;

      const coordinates: Coordinates[] = [];

      fitBounds(mockMap, coordinates);

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
    });

    it('should handle single coordinate', () => {
      const mockMap = {
        fitBounds: jest.fn(),
      } as any;

      const coordinates: Coordinates[] = [{ lat: 40.7128, lng: -74.006 }];

      fitBounds(mockMap, coordinates);

      expect(L.latLngBounds).toHaveBeenCalled();
      expect(mockMap.fitBounds).toHaveBeenCalled();
    });
  });

  describe('startLocationTracking', () => {
    it('should create a location tracker with initial coordinates', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };

      const tracker = startLocationTracking(mockMap, initialCoords, 'ambulance');

      expect(tracker).toHaveProperty('marker');
      expect(tracker).toHaveProperty('lastUpdate');
      expect(tracker).toHaveProperty('isTracking');
      expect(tracker.isTracking).toBe(true);
      expect(tracker.lastUpdate).toBeInstanceOf(Date);
    });

    it('should use default ambulance icon when not specified', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };

      const tracker = startLocationTracking(mockMap, initialCoords);

      expect(L.marker).toHaveBeenCalled();
      expect(tracker.marker).toBeDefined();
    });

    it('should support different marker icons', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };

      const tracker = startLocationTracking(mockMap, initialCoords, 'police');

      expect(L.marker).toHaveBeenCalled();
      expect(tracker.marker).toBeDefined();
    });
  });

  describe('updateTrackedLocation', () => {
    it('should update tracker position with new coordinates', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };
      const newCoords: Coordinates = { lat: 40.7589, lng: -73.9851 };

      const tracker = startLocationTracking(mockMap, initialCoords);
      const initialUpdate = tracker.lastUpdate;

      // Wait a bit to ensure timestamp changes
      jest.advanceTimersByTime(100);

      updateTrackedLocation(tracker, newCoords);

      expect(tracker.marker.setLatLng).toHaveBeenCalledWith([
        newCoords.lat,
        newCoords.lng,
      ]);
      expect(tracker.lastUpdate.getTime()).toBeGreaterThanOrEqual(
        initialUpdate.getTime()
      );
    });

    it('should not update when tracking is stopped', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };
      const newCoords: Coordinates = { lat: 40.7589, lng: -73.9851 };

      const tracker = startLocationTracking(mockMap, initialCoords);
      tracker.isTracking = false;

      jest.clearAllMocks();
      updateTrackedLocation(tracker, newCoords);

      expect(tracker.marker.setLatLng).not.toHaveBeenCalled();
    });

    it('should support smooth transitions', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };
      const newCoords: Coordinates = { lat: 40.7589, lng: -73.9851 };

      const tracker = startLocationTracking(mockMap, initialCoords);
      updateTrackedLocation(tracker, newCoords, true);

      expect(tracker.marker.setLatLng).toHaveBeenCalledWith([
        newCoords.lat,
        newCoords.lng,
      ]);
    });

    it('should support instant updates without animation', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };
      const newCoords: Coordinates = { lat: 40.7589, lng: -73.9851 };

      const tracker = startLocationTracking(mockMap, initialCoords);
      updateTrackedLocation(tracker, newCoords, false);

      expect(tracker.marker.setLatLng).toHaveBeenCalledWith([
        newCoords.lat,
        newCoords.lng,
      ]);
    });
  });

  describe('stopLocationTracking', () => {
    it('should stop tracking without removing marker', () => {
      const mockMap = {
        removeLayer: jest.fn(),
      } as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };

      const tracker = startLocationTracking(mockMap, initialCoords);
      stopLocationTracking(mockMap, tracker, false);

      expect(tracker.isTracking).toBe(false);
      expect(mockMap.removeLayer).not.toHaveBeenCalled();
    });

    it('should stop tracking and remove marker when requested', () => {
      const mockMap = {
        removeLayer: jest.fn(),
      } as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };

      const tracker = startLocationTracking(mockMap, initialCoords);
      stopLocationTracking(mockMap, tracker, true);

      expect(tracker.isTracking).toBe(false);
      expect(mockMap.removeLayer).toHaveBeenCalledWith(tracker.marker);
    });
  });

  describe('handleGPSCoordinates', () => {
    it('should validate and return valid coordinates', () => {
      const validCoords: Coordinates = { lat: 40.7128, lng: -74.006 };

      const result = handleGPSCoordinates(validCoords);

      expect(result).toEqual(validCoords);
    });

    it('should reject coordinates with invalid latitude (too high)', () => {
      const invalidCoords: Coordinates = { lat: 91, lng: -74.006 };

      const result = handleGPSCoordinates(invalidCoords);

      expect(result).toBeNull();
    });

    it('should reject coordinates with invalid latitude (too low)', () => {
      const invalidCoords: Coordinates = { lat: -91, lng: -74.006 };

      const result = handleGPSCoordinates(invalidCoords);

      expect(result).toBeNull();
    });

    it('should reject coordinates with invalid longitude (too high)', () => {
      const invalidCoords: Coordinates = { lat: 40.7128, lng: 181 };

      const result = handleGPSCoordinates(invalidCoords);

      expect(result).toBeNull();
    });

    it('should reject coordinates with invalid longitude (too low)', () => {
      const invalidCoords: Coordinates = { lat: 40.7128, lng: -181 };

      const result = handleGPSCoordinates(invalidCoords);

      expect(result).toBeNull();
    });

    it('should accept coordinates at valid boundaries', () => {
      const boundaryCoords = [
        { lat: 90, lng: 180 },
        { lat: -90, lng: -180 },
        { lat: 0, lng: 0 },
      ];

      boundaryCoords.forEach((coords) => {
        const result = handleGPSCoordinates(coords);
        expect(result).toEqual(coords);
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const coord1: Coordinates = { lat: 40.7128, lng: -74.006 };
      const coord2: Coordinates = { lat: 40.7589, lng: -73.9851 };

      const distance = calculateDistance(coord1, coord2);

      // Distance should be approximately 5.8 km (5800 meters)
      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(7000);
    });

    it('should return 0 for identical coordinates', () => {
      const coord: Coordinates = { lat: 40.7128, lng: -74.006 };

      const distance = calculateDistance(coord, coord);

      expect(distance).toBeCloseTo(0, 1);
    });

    it('should calculate distance for coordinates on opposite sides of equator', () => {
      const coord1: Coordinates = { lat: 10, lng: 0 };
      const coord2: Coordinates = { lat: -10, lng: 0 };

      const distance = calculateDistance(coord1, coord2);

      // Distance should be approximately 2220 km
      expect(distance).toBeGreaterThan(2000000);
      expect(distance).toBeLessThan(2500000);
    });

    it('should handle coordinates near poles', () => {
      const coord1: Coordinates = { lat: 89, lng: 0 };
      const coord2: Coordinates = { lat: 89, lng: 180 };

      const distance = calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('isSignificantLocationChange', () => {
    it('should return true for significant location changes', () => {
      const oldCoord: Coordinates = { lat: 40.7128, lng: -74.006 };
      const newCoord: Coordinates = { lat: 40.7589, lng: -73.9851 };

      const isSignificant = isSignificantLocationChange(oldCoord, newCoord);

      expect(isSignificant).toBe(true);
    });

    it('should return false for insignificant location changes', () => {
      const oldCoord: Coordinates = { lat: 40.7128, lng: -74.006 };
      const newCoord: Coordinates = { lat: 40.71281, lng: -74.00601 };

      const isSignificant = isSignificantLocationChange(oldCoord, newCoord);

      expect(isSignificant).toBe(false);
    });

    it('should use custom threshold when provided', () => {
      const oldCoord: Coordinates = { lat: 40.7128, lng: -74.006 };
      const newCoord: Coordinates = { lat: 40.7129, lng: -74.006 };

      // With default threshold (10m), this should be insignificant
      expect(isSignificantLocationChange(oldCoord, newCoord)).toBe(false);

      // With 1m threshold, this should be significant
      expect(isSignificantLocationChange(oldCoord, newCoord, 1)).toBe(true);
    });

    it('should return false for identical coordinates', () => {
      const coord: Coordinates = { lat: 40.7128, lng: -74.006 };

      const isSignificant = isSignificantLocationChange(coord, coord);

      expect(isSignificant).toBe(false);
    });
  });

  describe('centerMapOnLocation', () => {
    it('should center map on coordinates with zoom', () => {
      const mockMap = {
        setView: jest.fn(),
        panTo: jest.fn(),
      } as any;
      const coordinates: Coordinates = { lat: 40.7128, lng: -74.006 };
      const zoom = 15;

      centerMapOnLocation(mockMap, coordinates, zoom);

      expect(mockMap.setView).toHaveBeenCalledWith(
        [coordinates.lat, coordinates.lng],
        zoom
      );
      expect(mockMap.panTo).not.toHaveBeenCalled();
    });

    it('should pan to coordinates without changing zoom', () => {
      const mockMap = {
        setView: jest.fn(),
        panTo: jest.fn(),
      } as any;
      const coordinates: Coordinates = { lat: 40.7128, lng: -74.006 };

      centerMapOnLocation(mockMap, coordinates);

      expect(mockMap.panTo).toHaveBeenCalledWith([
        coordinates.lat,
        coordinates.lng,
      ]);
      expect(mockMap.setView).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle coordinates at extreme latitudes', () => {
      const mockMap = L.map('test') as any;
      const extremeCoords: Coordinates = { lat: 89.9, lng: 0 };

      const marker = addMarker(mockMap, extremeCoords, 'ambulance');

      expect(L.marker).toHaveBeenCalledWith(
        [extremeCoords.lat, extremeCoords.lng],
        expect.any(Object)
      );
    });

    it('should handle coordinates at extreme longitudes', () => {
      const mockMap = L.map('test') as any;
      const extremeCoords: Coordinates = { lat: 0, lng: 179.9 };

      const marker = addMarker(mockMap, extremeCoords, 'ambulance');

      expect(L.marker).toHaveBeenCalledWith(
        [extremeCoords.lat, extremeCoords.lng],
        expect.any(Object)
      );
    });

    it('should handle negative coordinates', () => {
      const mockMap = L.map('test') as any;
      const negativeCoords: Coordinates = { lat: -33.8688, lng: 151.2093 };

      const marker = addMarker(mockMap, negativeCoords, 'ambulance');

      expect(L.marker).toHaveBeenCalledWith(
        [negativeCoords.lat, negativeCoords.lng],
        expect.any(Object)
      );
    });

    it('should handle very long routes', () => {
      const mockMap = L.map('test') as any;
      const longPath: Coordinates[] = Array.from({ length: 100 }, (_, i) => ({
        lat: 40.7128 + i * 0.001,
        lng: -74.006 + i * 0.001,
      }));

      const polyline = drawRoute(mockMap, longPath);

      expect(L.polyline).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.arrayContaining([expect.any(Number), expect.any(Number)]),
        ]),
        expect.any(Object)
      );
    });

    it('should handle rapid location updates', () => {
      const mockMap = L.map('test') as any;
      const initialCoords: Coordinates = { lat: 40.7128, lng: -74.006 };
      const tracker = startLocationTracking(mockMap, initialCoords);

      // Simulate rapid GPS updates
      for (let i = 0; i < 10; i++) {
        const newCoords: Coordinates = {
          lat: 40.7128 + i * 0.0001,
          lng: -74.006 + i * 0.0001,
        };
        updateTrackedLocation(tracker, newCoords);
      }

      expect(tracker.marker.setLatLng).toHaveBeenCalledTimes(10);
    });

    it('should handle simulated GPS coordinates with noise', () => {
      const baseCoord: Coordinates = { lat: 40.7128, lng: -74.006 };
      
      // Simulate GPS noise (±0.001 degrees)
      const noisyCoord: Coordinates = {
        lat: baseCoord.lat + 0.0005,
        lng: baseCoord.lng - 0.0003,
      };

      const validated = handleGPSCoordinates(noisyCoord);

      expect(validated).not.toBeNull();
      expect(validated?.lat).toBeCloseTo(noisyCoord.lat, 4);
      expect(validated?.lng).toBeCloseTo(noisyCoord.lng, 4);
    });
  });
});
