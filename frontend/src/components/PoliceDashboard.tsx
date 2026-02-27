// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  initializeMap,
  addMarker,
  colorCodeRoute,
  fitBounds,
  type Coordinates,
  type RouteSegment,
} from '../services/mapService';
import { socketClient } from '../services/socketClient';

/**
 * PoliceDashboard Component
 * 
 * Dashboard for police control centers with:
 * - Real-time map showing ambulance locations
 * - Alert panel with incoming emergency alerts
 * - Action buttons (Dispatch Team, Mark Cleared)
 * - Dark professional theme
 * 
 * Requirements: 6.1, 10.6
 */

interface Alert {
  id: string;
  ambulanceId: string;
  ambulanceLocation: Coordinates;
  destination: Coordinates;
  congestionPoint: Coordinates;
  message: string;
  status: 'pending' | 'dispatched' | 'cleared' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export function PoliceDashboard() {
  // Map refs
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // State
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Initialize map on mount
  useEffect(() => {
    if (!mapRef.current) {
      // Center on a default city location
      mapRef.current = initializeMap('police-map', { lat: 40.7128, lng: -74.006 }, 12);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  // Connect to Socket.io and fetch initial alerts
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketClient.connect(token);
      setIsConnected(true);

      // Listen for new alerts
      socketClient.onAlertReceived((alert) => {
        setAlerts((prev) => {
          // Check if alert already exists
          const exists = prev.some((a) => a.id === alert.id);
          if (exists) {
            return prev.map((a) => (a.id === alert.id ? alert : a));
          }
          return [alert, ...prev];
        });

        // Add ambulance marker to map
        if (mapRef.current && alert.ambulanceLocation) {
          const marker = addMarker(
            mapRef.current,
            alert.ambulanceLocation,
            'ambulance'
          );
          markersRef.current.set(alert.id, marker);
        }
      });

      // Listen for alert updates
      socketClient.onAlertUpdated((alert) => {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? alert : a))
        );
      });

      socketClient.onDisconnect(() => {
        setIsConnected(false);
      });

      // Fetch existing alerts
      fetchAlerts();
    }

    return () => {
      socketClient.disconnect();
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts?status=pending,dispatched', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);

        // Add markers for all alerts
        if (mapRef.current) {
          data.alerts?.forEach((alert: Alert) => {
            if (alert.ambulanceLocation) {
              const marker = addMarker(
                mapRef.current!,
                alert.ambulanceLocation,
                'ambulance'
              );
              markersRef.current.set(alert.id, marker);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const handleDispatchTeam = async (alertId: string) => {
    setIsProcessing(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'dispatched' }),
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? data.alert : a))
        );
      } else {
        alert('Failed to dispatch team');
      }
    } catch (error) {
      console.error('Error dispatching team:', error);
      alert('Failed to dispatch team');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleMarkCleared = async (alertId: string) => {
    setIsProcessing(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'cleared' }),
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? data.alert : a))
        );

        // Remove marker from map
        const marker = markersRef.current.get(alertId);
        if (marker && mapRef.current) {
          mapRef.current.removeLayer(marker);
          markersRef.current.delete(alertId);
        }
      } else {
        alert('Failed to mark as cleared');
      }
    } catch (error) {
      console.error('Error marking as cleared:', error);
      alert('Failed to mark as cleared');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert.id);

    // Center map on alert location
    if (mapRef.current && alert.ambulanceLocation) {
      mapRef.current.setView(
        [alert.ambulanceLocation.lat, alert.ambulanceLocation.lng],
        15
      );
    }
  };

  const getAlertPriority = (alert: Alert): 'high' | 'medium' | 'low' => {
    const age = Date.now() - new Date(alert.createdAt).getTime();
    const minutes = age / (1000 * 60);

    if (minutes < 5) return 'high';
    if (minutes < 15) return 'medium';
    return 'low';
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const activeAlerts = alerts.filter((a) => a.status !== 'cleared' && a.status !== 'cancelled');
  const sortedAlerts = [...activeAlerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">🚓</div>
          <div>
            <h1 className="text-2xl font-bold text-white">Police Control Center</h1>
            <p className="text-sm text-gray-400">Emergency Response Coordination</p>
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
            <span className="text-sm text-gray-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Active Alerts Count */}
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
            {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
          </div>

          {/* User Info */}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-300">
              {localStorage.getItem('username') || 'Police Officer'}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Alert Panel */}
        <aside className="w-96 bg-gray-800 shadow-lg overflow-y-auto border-r border-gray-700">
          <div className="p-4">
            <h2 className="text-lg font-bold text-white mb-4">Emergency Alerts</h2>

            {sortedAlerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✓</div>
                <p className="text-gray-400">No active alerts</p>
                <p className="text-sm text-gray-500 mt-2">All clear!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedAlerts.map((alert) => {
                  const priority = getAlertPriority(alert);
                  const isSelected = selectedAlert === alert.id;

                  return (
                    <div
                      key={alert.id}
                      onClick={() => handleAlertClick(alert)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-900 border-2 border-blue-500'
                          : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                      } ${
                        priority === 'high'
                          ? 'ring-2 ring-red-500 ring-opacity-50'
                          : ''
                      }`}
                    >
                      {/* Alert Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="text-xl">🚑</div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Ambulance #{alert.ambulanceId.slice(0, 8)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTime(alert.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            priority === 'high'
                              ? 'bg-red-600 text-white'
                              : priority === 'medium'
                              ? 'bg-orange-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}
                        >
                          {priority.toUpperCase()}
                        </div>
                      </div>

                      {/* Alert Message */}
                      <p className="text-sm text-gray-300 mb-3">{alert.message}</p>

                      {/* Alert Status */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-400">Status:</span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            alert.status === 'pending'
                              ? 'bg-yellow-900 text-yellow-300'
                              : alert.status === 'dispatched'
                              ? 'bg-blue-900 text-blue-300'
                              : 'bg-green-900 text-green-300'
                          }`}
                        >
                          {alert.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        {alert.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDispatchTeam(alert.id);
                            }}
                            disabled={isProcessing === alert.id}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing === alert.id ? 'Processing...' : 'Dispatch Team'}
                          </button>
                        )}
                        {(alert.status === 'pending' || alert.status === 'dispatched') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkCleared(alert.id);
                            }}
                            disabled={isProcessing === alert.id}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing === alert.id ? 'Processing...' : 'Mark Cleared'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative">
          <div id="police-map" className="w-full h-full" />

          {/* Map Legend */}
          <div className="absolute bottom-6 right-6 bg-gray-800 bg-opacity-95 rounded-lg p-4 shadow-lg border border-gray-700">
            <h3 className="font-semibold text-white mb-3 text-sm">Map Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="text-lg">🚑</div>
                <span className="text-xs text-gray-300">Ambulance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-lg">🏥</div>
                <span className="text-xs text-gray-300">Hospital</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-green-500 rounded" />
                <span className="text-xs text-gray-300">Clear</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-orange-500 rounded" />
                <span className="text-xs text-gray-300">Moderate</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-red-500 rounded" />
                <span className="text-xs text-gray-300">Congested</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
