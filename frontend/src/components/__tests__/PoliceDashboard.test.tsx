// @ts-nocheck
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PoliceDashboard } from '../PoliceDashboard';
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

describe('PoliceDashboard', () => {
  const mockMap = {
    remove: jest.fn(),
    removeLayer: jest.fn(),
    setView: jest.fn(),
  };

  const mockMarker = {
    setLatLng: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup map service mocks
    (mapService.initializeMap as jest.Mock).mockReturnValue(mockMap);
    (mapService.addMarker as jest.Mock).mockReturnValue(mockMarker);
    (mapService.colorCodeRoute as jest.Mock).mockReturnValue([]);
    (mapService.fitBounds as jest.Mock).mockImplementation(() => {});

    // Setup socket client mocks
    (socketClient.connect as jest.Mock).mockImplementation(() => {});
    (socketClient.disconnect as jest.Mock).mockImplementation(() => {});
    (socketClient.onAlertReceived as jest.Mock).mockImplementation(() => {});
    (socketClient.onAlertUpdated as jest.Mock).mockImplementation(() => {});
    (socketClient.onDisconnect as jest.Mock).mockImplementation(() => {});

    // Setup localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'username') return 'Officer Smith';
      return null;
    });

    // Setup fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ alerts: [] }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the dashboard with header', () => {
      render(<PoliceDashboard />);

      expect(screen.getByText('Police Control Center')).toBeInTheDocument();
      expect(screen.getByText('Emergency Response Coordination')).toBeInTheDocument();
    });

    it('should display user information', () => {
      render(<PoliceDashboard />);

      expect(screen.getByText('Officer Smith')).toBeInTheDocument();
    });

    it('should show connection status', () => {
      render(<PoliceDashboard />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show active alerts count', () => {
      render(<PoliceDashboard />);

      expect(screen.getByText(/0 Active Alert/)).toBeInTheDocument();
    });

    it('should render map legend', () => {
      render(<PoliceDashboard />);

      expect(screen.getByText('Map Legend')).toBeInTheDocument();
    });
  });

  describe('Map Initialization', () => {
    it('should initialize map on mount', () => {
      render(<PoliceDashboard />);

      expect(mapService.initializeMap).toHaveBeenCalledWith(
        'police-map',
        expect.objectContaining({
          lat: expect.any(Number),
          lng: expect.any(Number),
        }),
        12
      );
    });

    it('should cleanup map on unmount', () => {
      const { unmount } = render(<PoliceDashboard />);

      unmount();

      expect(mockMap.remove).toHaveBeenCalled();
    });
  });

  describe('Alert Display', () => {
    it('should fetch alerts on mount', async () => {
      render(<PoliceDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/alerts'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should display "No active alerts" when there are no alerts', () => {
      render(<PoliceDashboard />);

      expect(screen.getByText('No active alerts')).toBeInTheDocument();
      expect(screen.getByText('All clear!')).toBeInTheDocument();
    });

    it('should display alerts in the panel', async () => {
      const mockAlerts = [
        {
          id: '1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7128, lng: -74.006 },
          message: 'Emergency: Traffic blockage',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      render(<PoliceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Ambulance #amb-123/)).toBeInTheDocument();
        expect(screen.getByText('Emergency: Traffic blockage')).toBeInTheDocument();
      });
    });

    it('should show alert priority badges', async () => {
      const mockAlerts = [
        {
          id: '1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7128, lng: -74.006 },
          message: 'Emergency',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      render(<PoliceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
      });
    });

    it('should sort alerts chronologically', async () => {
      const now = Date.now();
      const mockAlerts = [
        {
          id: '1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7128, lng: -74.006 },
          message: 'Old alert',
          status: 'pending',
          createdAt: new Date(now - 10000).toISOString(),
          updatedAt: new Date(now - 10000).toISOString(),
        },
        {
          id: '2',
          ambulanceId: 'amb-456',
          ambulanceLocation: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7128, lng: -74.006 },
          message: 'New alert',
          status: 'pending',
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      render(<PoliceDashboard />);

      await waitFor(() => {
        const alerts = screen.getAllByText(/Ambulance #/);
        expect(alerts[0]).toHaveTextContent('amb-456');
        expect(alerts[1]).toHaveTextContent('amb-123');
      });
    });
  });

  describe('Alert Actions', () => {
    it('should show dispatch button for pending alerts', async () => {
      const mockAlerts = [
        {
          id: '1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7128, lng: -74.006 },
          message: 'Emergency',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      render(<PoliceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dispatch Team')).toBeInTheDocument();
      });
    });

    it('should dispatch team when button is clicked', async () => {
      const mockAlerts = [
        {
          id: '1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7128, lng: -74.006 },
          message: 'Emergency',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ alerts: mockAlerts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alert: { ...mockAlerts[0], status: 'dispatched' },
          }),
        });

      render(<PoliceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dispatch Team')).toBeInTheDocument();
      });

      const dispatchButton = screen.getByText('Dispatch Team');
      fireEvent.click(dispatchButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/alerts/1/status',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ status: 'dispatched' }),
          })
        );
      });
    });

    it('should mark alert as cleared when button is clicked', async () => {
      const mockAlerts = [
        {
          id: '1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7128, lng: -74.006 },
          message: 'Emergency',
          status: 'dispatched',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ alerts: mockAlerts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alert: { ...mockAlerts[0], status: 'cleared' },
          }),
        });

      render(<PoliceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Mark Cleared')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Mark Cleared');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/alerts/1/status',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ status: 'cleared' }),
          })
        );
      });
    });

    it('should center map on alert when clicked', async () => {
      const mockAlerts = [
        {
          id: '1',
          ambulanceId: 'amb-123',
          ambulanceLocation: { lat: 40.7128, lng: -74.006 },
          destination: { lat: 40.7589, lng: -73.9851 },
          congestionPoint: { lat: 40.7128, lng: -74.006 },
          message: 'Emergency',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockAlerts }),
      });

      render(<PoliceDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Ambulance #amb-123/)).toBeInTheDocument();
      });

      const alertCard = screen.getByText(/Ambulance #amb-123/).closest('div');
      fireEvent.click(alertCard!);

      expect(mockMap.setView).toHaveBeenCalledWith([40.7128, -74.006], 15);
    });
  });

  describe('Socket.io Integration', () => {
    it('should connect to Socket.io on mount', () => {
      render(<PoliceDashboard />);

      expect(socketClient.connect).toHaveBeenCalledWith('mock-token');
    });

    it('should listen for new alerts', () => {
      render(<PoliceDashboard />);

      expect(socketClient.onAlertReceived).toHaveBeenCalled();
    });

    it('should add new alert to list when received', async () => {
      let alertCallback: any;
      (socketClient.onAlertReceived as jest.Mock).mockImplementation((callback) => {
        alertCallback = callback;
      });

      render(<PoliceDashboard />);

      const newAlert = {
        id: '2',
        ambulanceId: 'amb-456',
        ambulanceLocation: { lat: 40.7589, lng: -73.9851 },
        destination: { lat: 40.7614, lng: -73.9776 },
        congestionPoint: { lat: 40.7589, lng: -73.9851 },
        message: 'New emergency',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      alertCallback(newAlert);

      await waitFor(() => {
        expect(screen.getByText('New emergency')).toBeInTheDocument();
      });
    });

    it('should disconnect from Socket.io on unmount', () => {
      const { unmount } = render(<PoliceDashboard />);

      unmount();

      expect(socketClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    it('should clear localStorage and redirect on logout', () => {
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<PoliceDashboard />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      expect(localStorageMock.clear).toHaveBeenCalled();
      expect(window.location.href).toBe('/');
    });
  });
});
