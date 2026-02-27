// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  initializeMap,
  startLocationTracking,
  updateTrackedLocation,
  handleGPSCoordinates,
  isSignificantLocationChange,
  colorCodeRoute,
  addMarker,
  fitBounds,
  clearRoutes,
  type Coordinates,
  type LocationTracker,
  type RouteSegment,
} from '../services/mapService';
import { socketClient } from '../services/socketClient';

/**
 * AmbulanceDashboard Component
 * 
 * Main dashboard for ambulance drivers with:
 * - Real-time map with location tracking
 * - Destination input and hospital selection
 * - Emergency alert button
 * - Route visualization with congestion
 * 
 * Requirements: 2.1, 3.1, 5.1, 10.7
 */

interface Hospital {
  id: string;
  name: string;
  location: Coordinates;
  distance?: number;
}

interface Route {
  path: Coordinates[];
  segments: RouteSegment[];
  totalDistance: number;
  estimatedTime: number;
}

export function AmbulanceDashboard() {
  // Map refs
  const mapRef = useRef<L.Map | null>(null);
  const trackerRef = useRef<LocationTracker | null>(null);
  const routePolylinesRef = useRef<L.Polyline[]>([]);
  const destinationMarkerRef = useRef<L.Marker | null>(null);

  // State
  const [ambulancePosition, setAmbulancePosition] = useState<Coordinates>({
    lat: 40.7128,
    lng: -74.006,
  });
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // Initialize map on mount
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = initializeMap('ambulance-map', ambulancePosition, 13);
      trackerRef.current = startLocationTracking(
        mapRef.current,
        ambulancePosition,
        'ambulance'
      );
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  // Update tracker when position changes
  useEffect(() => {
    if (trackerRef.current && mapRef.current) {
      const validated = handleGPSCoordinates(ambulancePosition);
      if (validated) {
        updateTrackedLocation(trackerRef.current, validated, true);
        
        // Emit location update via Socket.io
        if (isConnected) {
          socketClient.emitLocationUpdate(validated);
        }
      }
    }
  }, [ambulancePosition, isConnected]);

  // Simulate GPS updates (in production, this would come from real GPS or simulation service)
  useEffect(() => {
    const interval = setInterval(() => {
      // TODO: Replace with actual GPS or simulation service
      // For now, just keep the current position
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Fetch hospitals on mount
  useEffect(() => {
    fetchHospitals();
  }, [ambulancePosition]);

  // Connect to Socket.io
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketClient.connect(token);
      setIsConnected(true);

      // Listen for alert updates
      socketClient.onAlertUpdated((alert) => {
        if (alert.status === 'dispatched') {
          setAlertMessage('Police team dispatched to clear route!');
          setTimeout(() => setAlertMessage(''), 5000);
        } else if (alert.status === 'cleared') {
          setAlertMessage('Blockage cleared! Recalculating route...');
          setTimeout(() => setAlertMessage(''), 5000);
          
          // Recalculate route
          if (destination) {
            calculateRoute(destination);
          }
        }
      });

      socketClient.onDisconnect(() => {
        setIsConnected(false);
      });
    }

    return () => {
      socketClient.disconnect();
    };
  }, [destination]);

  const fetchHospitals = async () => {
    try {
      const response = await fetch(
        `/api/hospitals?lat=${ambulancePosition.lat}&lng=${ambulancePosition.lng}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHospitals(data.hospitals || []);
      }
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
    }
  };

  const calculateRoute = async (dest: Coordinates) => {
    setIsLoadingRoute(true);
    try {
      const response = await fetch('/api/routes/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          start: ambulancePosition,
          destination: dest,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoute(data.route);
        
        // Clear existing routes
        if (mapRef.current) {
          clearRoutes(mapRef.current);
        }
        
        // Draw new route with color coding
        if (mapRef.current && data.route.segments) {
          const polylines = colorCodeRoute(mapRef.current, data.route.segments);
          routePolylinesRef.current = polylines;
          
          // Fit bounds to show entire route
          const allCoords = [ambulancePosition, dest];
          fitBounds(mapRef.current, allCoords);
        }
      } else {
        console.error('Failed to calculate route');
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleHospitalSelect = (hospitalId: string) => {
    setSelectedHospital(hospitalId);
    const hospital = hospitals.find((h) => h.id === hospitalId);
    
    if (hospital && mapRef.current) {
      setDestination(hospital.location);
      
      // Add destination marker
      if (destinationMarkerRef.current) {
        mapRef.current.removeLayer(destinationMarkerRef.current);
      }
      destinationMarkerRef.current = addMarker(
        mapRef.current,
        hospital.location,
        'hospital'
      );
      
      // Calculate route
      calculateRoute(hospital.location);
    }
  };

  const handleEmergencyAlert = async () => {
    if (!destination) {
      alert('Please select a destination first');
      return;
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ambulanceLocation: ambulancePosition,
          destination: destination,
          congestionPoint: ambulancePosition, // TODO: Detect actual congestion point
          message: 'Emergency: Traffic blockage detected, need immediate assistance',
        }),
      });

      if (response.ok) {
        setAlertSent(true);
        setAlertMessage('Emergency alert sent to police!');
        setTimeout(() => {
          setAlertSent(false);
          setAlertMessage('');
        }, 5000);
      } else {
        alert('Failed to send alert');
      }
    } catch (error) {
      console.error('Error sending alert:', error);
      alert('Failed to send alert');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">🚑</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ambulance Dashboard</h1>
            <p className="text-sm text-gray-500">Emergency Route Optimizer</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* User Info */}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">
              {localStorage.getItem('username') || 'Ambulance Driver'}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-96 bg-white shadow-lg overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Emergency Alert Button */}
            <div>
              <button
                onClick={handleEmergencyAlert}
                disabled={!destination || alertSent}
                className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg transform transition-all ${
                  alertSent
                    ? 'bg-green-500 scale-95'
                    : 'bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {alertSent ? '✓ Alert Sent' : '🚨 Emergency Alert'}
              </button>
              {alertMessage && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">{alertMessage}</p>
                </div>
              )}
            </div>

            {/* Hospital Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Destination Hospital
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => handleHospitalSelect(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Choose a hospital...</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                    {hospital.distance && ` (${hospital.distance.toFixed(1)} km)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Route Information */}
            {route && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-800">Route Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Distance:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {route.totalDistance.toFixed(1)} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Estimated Time:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {route.estimatedTime} min
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Traffic Status:</span>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 rounded-full bg-green-500" title="Clear" />
                      <div className="w-3 h-3 rounded-full bg-orange-500" title="Moderate" />
                      <div className="w-3 h-3 rounded-full bg-red-500" title="Congested" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isLoadingRoute && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                <p className="mt-2 text-sm text-gray-600">Calculating route...</p>
              </div>
            )}

            {/* Current Location */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Current Location</h3>
              <p className="text-xs text-gray-600 font-mono">
                {ambulancePosition.lat.toFixed(6)}, {ambulancePosition.lng.toFixed(6)}
              </p>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Map Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="text-xl">🚑</div>
                  <span className="text-sm text-gray-600">Your Ambulance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-xl">🏥</div>
                  <span className="text-sm text-gray-600">Hospital</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-green-500 rounded" />
                  <span className="text-sm text-gray-600">Clear Traffic</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-orange-500 rounded" />
                  <span className="text-sm text-gray-600">Moderate Traffic</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-red-500 rounded" />
                  <span className="text-sm text-gray-600">Heavy Traffic</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative">
          <div id="ambulance-map" className="w-full h-full" />
        </main>
      </div>
    </div>
  );
}
