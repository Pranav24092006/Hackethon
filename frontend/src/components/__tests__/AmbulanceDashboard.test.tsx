// @ts-nocheck
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AmbulanceDashboard } from '../AmbulanceDashboard';
import * as mapService from '../../services/mapService';
import { socketClient } from '../../services/socketClient';

// Mock services
jest.mock('../../services/mapService');
jest.mock('../../services/socketClient');

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('AmbulanceDashboard', () => {
  const mockMap = {
    remove: jest.fn(),
    removeLayer: jest.fn(),
  };

  const mockTracker = {
    marker: {
      setLatLng: jest.fn(),
    },
    lastUpdate: new Date(),
    isTracking: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup map service mocks
    (mapService.initializeMap as jest.Mock).mockReturnValue(mockMap);
    (mapService.startLocationTracking as jest.Mock).mockReturnValue(mockTracker);
    (mapService.handleGPSCoordinates as jest.Mock).mockImplementation((coords) => coords);
    (mapService.updateTrackedLocation as jest.Mock).mockImplementation(() => {});
    (mapService.colorCodeRoute as jest.Mock).mockReturnValue([]);
    (mapService.addMarker as jest.Mock).mockReturnValue({});
    (mapService.clearRoutes as jest.Mock).mockImplementation(() => {});
    (mapService.fitBounds as jest.Mock).mockImplementation(() => {});

    // Setup socket client mocks
    (socketClient.connect as jest.Mock).mockImplementation(() => {});
    (socketClient.disconnect as jest.Mock).mockImplementation(() => {});
    (socketClient.emitLocationUpdate as jest.Mock).mockImplementation(() => {});
    (socketClient.onAlertUpdated as jest.Mock).mockImplementation(() => {});
    (socketClient.onDisconnect as jest.Mock).mockImplementation(() => {});

    // Setup localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'username') return 'Test Driver';
      return null;
    });

    // Setup fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ hospitals: [] }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the dashboard with header', () => {
      render(<AmbulanceDashboard />);

      expect(screen.getByText('Ambulance Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Emergency Route Optimizer')).toBeInTheDocument();
    });

    it('should display user information from localStorage', () => {
      render(<AmbulanceDashboard />);

      expect(screen.getByText('Test Driver')).toBeInTheDocument();
    });

    it('should show connection status indicator', () => {
      render(<AmbulanceDashboard />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should render emergency alert button', () => {
      render(<AmbulanceDashboard />);

      expect(screen.getByText('🚨 Emergency Alert')).toBeInTheDocument();
    });

    it('should render hospital selection dropdown', () => {
      render(<AmbulanceDashboard />);

      expect(screen.getByText('Select Destination Hospital')).toBeInTheDocument();
      expect(screen.getByText('Choose a hospital...')).toBeInTheDocument();
    });

    it('should render map legend', () => {
      render(<AmbulanceDashboard />);

      expect(screen.getByText('Map Legend')).toBeInTheDocument();
      expect(screen.getByText('Your Ambulance')).toBeInTheDocument();
      expect(screen.getByText('Hospital')).toBeInTheDocument();
      expect(screen.getByText('Clear Traffic')).toBeInTheDocument();
      expect(screen.getByText('Moderate Traffic')).toBeInTheDocument();
      expect(screen.getByText('Heavy Traffic')).toBeInTheDocument();
    });
  });

  describe('Map Initialization', () => {
    it('should initialize map on mount', () => {
      render(<AmbulanceDashboard />);

      expect(mapService.initializeMap).toHaveBeenCalledWith(
        'ambulance-map',
        expect.objectContaining({
          lat: expect.any(Number),
          lng: expect.any(Number),
        }),
        13
      );
    });

    it('should start location tracking on mount', () => {
      render(<AmbulanceDashboard />);

      expect(mapService.startLocationTracking).toHaveBeenCalledWith(
        mockMap,
        expect.objectContaining({
          lat: expect.any(Number),
          lng: expect.any(Number),
        }),
        'ambulance'
      );
    });

    it('should cleanup map on unmount', () => {
      const { unmount } = render(<AmbulanceDashboard />);

      unmount();

      expect(mockMap.remove).toHaveBeenCalled();
    });
  });

  describe('Hospital Selection', () => {
    it('should fetch hospitals on mount', async () => {
      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/hospitals'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should display hospitals in dropdown', async () => {
      const mockHospitals = [
        {
          id: '1',
          name: 'City Hospital',
          location: { lat: 40.7589, lng: -73.9851 },
          distance: 5.2,
        },
        {
          id: '2',
          name: 'General Hospital',
          location: { lat: 40.7614, lng: -73.9776 },
          distance: 6.8,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hospitals: mockHospitals }),
      });

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/City Hospital/)).toBeInTheDocument();
        expect(screen.getByText(/General Hospital/)).toBeInTheDocument();
      });
    });

    it('should calculate route when hospital is selected', async () => {
      const mockHospitals = [
        {
          id: '1',
          name: 'City Hospital',
          location: { lat: 40.7589, lng: -73.9851 },
        },
      ];

      const mockRoute = {
        path: [
          { lat: 40.7128, lng: -74.006 },
          { lat: 40.7589, lng: -73.9851 },
        ],
        segments: [],
        totalDistance: 5.2,
        estimatedTime: 12,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hospitals: mockHospitals }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ route: mockRoute }),
        });

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/City Hospital/)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/routes/calculate',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should add destination marker when hospital is selected', async () => {
      const mockHospitals = [
        {
          id: '1',
          name: 'City Hospital',
          location: { lat: 40.7589, lng: -73.9851 },
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hospitals: mockHospitals }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ route: {} }),
        });

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/City Hospital/)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(mapService.addMarker).toHaveBeenCalledWith(
          mockMap,
          { lat: 40.7589, lng: -73.9851 },
          'hospital'
        );
      });
    });
  });

  describe('Route Visualization', () => {
    it('should display route information when route is calculated', async () => {
      const mockRoute = {
        path: [],
        segments: [],
        totalDistance: 5.2,
        estimatedTime: 12,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hospitals: [
              { id: '1', name: 'Hospital', location: { lat: 40.7589, lng: -73.9851 } },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ route: mockRoute }),
        });

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Hospital/)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('Route Information')).toBeInTheDocument();
        expect(screen.getByText('5.2 km')).toBeInTheDocument();
        expect(screen.getByText('12 min')).toBeInTheDocument();
      });
    });

    it('should clear existing routes before drawing new route', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hospitals: [
              { id: '1', name: 'Hospital', location: { lat: 40.7589, lng: -73.9851 } },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            route: {
              path: [],
              segments: [
                {
                  start: { lat: 40.7128, lng: -74.006 },
                  end: { lat: 40.7589, lng: -73.9851 },
                  congestionLevel: 'green',
                },
              ],
              totalDistance: 5.2,
              estimatedTime: 12,
            },
          }),
        });

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Hospital/)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(mapService.clearRoutes).toHaveBeenCalledWith(mockMap);
        expect(mapService.colorCodeRoute).toHaveBeenCalled();
      });
    });

    it('should show loading indicator while calculating route', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hospitals: [
              { id: '1', name: 'Hospital', location: { lat: 40.7589, lng: -73.9851 } },
            ],
          }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({ route: {} }),
                  }),
                100
              )
            )
        );

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Hospital/)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      expect(screen.getByText('Calculating route...')).toBeInTheDocument();
    });
  });

  describe('Emergency Alert', () => {
    it('should be disabled when no destination is selected', () => {
      render(<AmbulanceDashboard />);

      const alertButton = screen.getByText('🚨 Emergency Alert');
      expect(alertButton).toBeDisabled();
    });

    it('should send alert when button is clicked with destination', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hospitals: [
              { id: '1', name: 'Hospital', location: { lat: 40.7589, lng: -73.9851 } },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ route: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ alert: { id: '123' } }),
        });

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Hospital/)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        const alertButton = screen.getByText('🚨 Emergency Alert');
        expect(alertButton).not.toBeDisabled();
      });

      const alertButton = screen.getByText('🚨 Emergency Alert');
      fireEvent.click(alertButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/alerts',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-token',
            }),
            body: expect.stringContaining('Emergency'),
          })
        );
      });
    });

    it('should show confirmation message after sending alert', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hospitals: [
              { id: '1', name: 'Hospital', location: { lat: 40.7589, lng: -73.9851 } },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ route: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ alert: { id: '123' } }),
        });

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Hospital/)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        const alertButton = screen.getByText('🚨 Emergency Alert');
        expect(alertButton).not.toBeDisabled();
      });

      const alertButton = screen.getByText('🚨 Emergency Alert');
      fireEvent.click(alertButton);

      await waitFor(() => {
        expect(screen.getByText('Emergency alert sent to police!')).toBeInTheDocument();
        expect(screen.getByText('✓ Alert Sent')).toBeInTheDocument();
      });
    });
  });

  describe('Socket.io Integration', () => {
    it('should connect to Socket.io on mount', () => {
      render(<AmbulanceDashboard />);

      expect(socketClient.connect).toHaveBeenCalledWith('mock-token');
    });

    it('should listen for alert updates', () => {
      render(<AmbulanceDashboard />);

      expect(socketClient.onAlertUpdated).toHaveBeenCalled();
    });

    it('should show message when police dispatches team', async () => {
      let alertCallback: any;
      (socketClient.onAlertUpdated as jest.Mock).mockImplementation((callback) => {
        alertCallback = callback;
      });

      render(<AmbulanceDashboard />);

      // Simulate alert update
      alertCallback({ status: 'dispatched' });

      await waitFor(() => {
        expect(screen.getByText('Police team dispatched to clear route!')).toBeInTheDocument();
      });
    });

    it('should recalculate route when blockage is cleared', async () => {
      let alertCallback: any;
      (socketClient.onAlertUpdated as jest.Mock).mockImplementation((callback) => {
        alertCallback = callback;
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hospitals: [
              { id: '1', name: 'Hospital', location: { lat: 40.7589, lng: -73.9851 } },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ route: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ route: {} }),
        });

      render(<AmbulanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Hospital/)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Simulate blockage cleared
      alertCallback({ status: 'cleared' });

      await waitFor(() => {
        expect(screen.getByText('Blockage cleared! Recalculating route...')).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should disconnect from Socket.io on unmount', () => {
      const { unmount } = render(<AmbulanceDashboard />);

      unmount();

      expect(socketClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    it('should clear localStorage and redirect on logout', () => {
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<AmbulanceDashboard />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      expect(localStorageMock.clear).toHaveBeenCalled();
      expect(window.location.href).toBe('/');
    });
  });
});
