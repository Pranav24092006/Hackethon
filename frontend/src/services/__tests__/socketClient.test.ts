/**
 * Tests for Socket.io Client Service
 * 
 * Tests connection management, event listeners, event emitters,
 * automatic reconnection with exponential backoff, and connection status.
 * 
 * Note: Run 'npm install' in the frontend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { SocketClient, getAmbulanceClient, getPoliceClient, resetClients } from '../socketClient';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

describe('SocketClient', () => {
  let mockSocket: any;
  let client: SocketClient;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock socket
    mockSocket = {
      id: 'mock-socket-id',
      connected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
      removeAllListeners: jest.fn()
    };

    // Mock io function to return mock socket
    (io as jest.MockedFunction<typeof io>).mockReturnValue(mockSocket as any);

    // Create client instance
    client = new SocketClient('ambulance');
  });

  afterEach(() => {
    jest.useRealTimers();
    resetClients();
  });

  describe('connect()', () => {
    it('should create socket connection with correct URL and auth token', () => {
      const token = 'test-jwt-token';
      
      client.connect(token, 'http://localhost:3000');

      expect(io).toHaveBeenCalledWith(
        'http://localhost:3000/ambulance',
        expect.objectContaining({
          auth: { token },
          autoConnect: true,
          reconnection: false,
          transports: ['websocket', 'polling']
        })
      );
    });

    it('should use window.location.origin if no server URL provided', () => {
      const token = 'test-jwt-token';
      const originalOrigin = window.location.origin;
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://test-origin.com' },
        writable: true
      });

      client.connect(token);

      expect(io).toHaveBeenCalledWith(
        'http://test-origin.com/ambulance',
        expect.any(Object)
      );

      // Restore original origin
      Object.defineProperty(window, 'location', {
        value: { origin: originalOrigin },
        writable: true
      });
    });

    it('should not reconnect if already connected', () => {
      mockSocket.connected = true;
      const token = 'test-jwt-token';

      client.connect(token);
      client.connect(token); // Try to connect again

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('should set up event handlers on connection', () => {
      const token = 'test-jwt-token';
      
      client.connect(token);

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('heartbeat', expect.any(Function));
    });
  });

  describe('disconnect()', () => {
    it('should close socket and remove all listeners', () => {
      const token = 'test-jwt-token';
      client.connect(token);

      client.disconnect();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.close).toHaveBeenCalled();
    });

    it('should update connection status to disconnected', () => {
      const token = 'test-jwt-token';
      const statusCallback = jest.fn();
      
      client.connect(token);
      client.onConnectionStatusChange(statusCallback);
      client.disconnect();

      expect(statusCallback).toHaveBeenCalledWith({
        connected: false,
        reconnecting: false,
        reconnectAttempts: 0
      });
    });

    it('should prevent automatic reconnection after manual disconnect', () => {
      const token = 'test-jwt-token';
      client.connect(token);

      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];

      client.disconnect();
      
      // Simulate disconnect event
      if (disconnectHandler) {
        disconnectHandler('manual disconnect');
      }

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Should not attempt to reconnect
      expect(io).toHaveBeenCalledTimes(1);
    });
  });

  describe('isConnected()', () => {
    it('should return false when not connected', () => {
      expect(client.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      const token = 'test-jwt-token';
      client.connect(token);
      mockSocket.connected = true;

      expect(client.isConnected()).toBe(true);
    });
  });

  describe('Connection status callbacks', () => {
    it('should notify callbacks on connection', () => {
      const statusCallback = jest.fn();
      const token = 'test-jwt-token';

      client.onConnectionStatusChange(statusCallback);
      client.connect(token);

      // Get the connect handler
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];

      // Simulate connection
      mockSocket.connected = true;
      if (connectHandler) {
        connectHandler();
      }

      expect(statusCallback).toHaveBeenCalledWith({
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0
      });
    });

    it('should allow unsubscribing from status callbacks', () => {
      const statusCallback = jest.fn();
      const token = 'test-jwt-token';

      const unsubscribe = client.onConnectionStatusChange(statusCallback);
      unsubscribe();

      client.connect(token);

      // Get the connect handler
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];

      // Simulate connection
      if (connectHandler) {
        connectHandler();
      }

      expect(statusCallback).not.toHaveBeenCalled();
    });
  });

  describe('Automatic reconnection', () => {
    it('should attempt reconnection on disconnect with exponential backoff', () => {
      const token = 'test-jwt-token';
      client.connect(token);

      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];

      // Simulate disconnect
      mockSocket.connected = false;
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }

      // First reconnection attempt after 1 second
      jest.advanceTimersByTime(1000);
      expect(io).toHaveBeenCalledTimes(2);

      // Simulate another disconnect
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }

      // Second reconnection attempt after 2 seconds
      jest.advanceTimersByTime(2000);
      expect(io).toHaveBeenCalledTimes(3);

      // Simulate another disconnect
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }

      // Third reconnection attempt after 4 seconds
      jest.advanceTimersByTime(4000);
      expect(io).toHaveBeenCalledTimes(4);
    });

    it('should stop reconnecting after max attempts', () => {
      const token = 'test-jwt-token';
      const statusCallback = jest.fn();
      
      client.connect(token);
      client.onConnectionStatusChange(statusCallback);

      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];

      // Simulate 5 disconnects (max attempts)
      for (let i = 0; i < 5; i++) {
        mockSocket.connected = false;
        if (disconnectHandler) {
          disconnectHandler('transport close');
        }
        jest.advanceTimersByTime(Math.pow(2, i) * 1000);
      }

      // Try one more time - should not reconnect
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }
      jest.advanceTimersByTime(60000);

      // Should have initial connection + 5 reconnection attempts = 6 total
      expect(io).toHaveBeenCalledTimes(6);

      // Should notify that reconnection stopped
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: false,
          reconnecting: false
        })
      );
    });

    it('should cap reconnection delay at max delay', () => {
      const token = 'test-jwt-token';
      client.connect(token);

      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];

      // Simulate disconnect
      mockSocket.connected = false;
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }

      // Advance by 1s, 2s, 4s, 8s (total 15s)
      for (let i = 0; i < 4; i++) {
        jest.advanceTimersByTime(Math.pow(2, i) * 1000);
      }

      // Next delay should be capped at 30s, not 16s
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }

      jest.advanceTimersByTime(29000); // Just before 30s
      const callsBefore = io.mock.calls.length;

      jest.advanceTimersByTime(1000); // Complete 30s
      const callsAfter = io.mock.calls.length;

      expect(callsAfter).toBeGreaterThan(callsBefore);
    });

    it('should reset reconnection attempts on successful connection', () => {
      const token = 'test-jwt-token';
      client.connect(token);

      // Get handlers
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'disconnect'
      )?.[1];
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )?.[1];

      // Simulate disconnect and reconnect
      mockSocket.connected = false;
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }

      jest.advanceTimersByTime(1000);

      // Simulate successful reconnection
      mockSocket.connected = true;
      if (connectHandler) {
        connectHandler();
      }

      // Disconnect again
      mockSocket.connected = false;
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }

      // Should use initial delay (1s) not 2s
      jest.advanceTimersByTime(1000);
      expect(io).toHaveBeenCalledTimes(3); // Initial + 2 reconnects
    });
  });

  describe('onAlertReceived()', () => {
    it('should register listener for alert:created event', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn();

      client.connect(token);
      client.onAlertReceived(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('alert:created', expect.any(Function));
    });

    it('should call callback when alert is received', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn();
      const mockAlert = {
        id: 'alert-1',
        ambulanceId: 'amb-1',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7489, lng: -73.9680 },
        message: 'Traffic blockage',
        status: 'pending' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      client.connect(token);
      client.onAlertReceived(callback);

      // Get the alert handler
      const alertHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'alert:created'
      )?.[1];

      // Simulate alert received
      if (alertHandler) {
        alertHandler({ alert: mockAlert });
      }

      expect(callback).toHaveBeenCalledWith(mockAlert);
    });

    it('should allow unsubscribing from alert events', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn();

      client.connect(token);
      const unsubscribe = client.onAlertReceived(callback);
      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith('alert:created', expect.any(Function));
    });

    it('should handle errors in callback gracefully', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      client.connect(token);
      client.onAlertReceived(callback);

      // Get the alert handler
      const alertHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'alert:created'
      )?.[1];

      // Simulate alert received - should not throw
      expect(() => {
        if (alertHandler) {
          alertHandler({ alert: {} });
        }
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('onAlertUpdated()', () => {
    it('should register listener for alert:updated event', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn();

      client.connect(token);
      client.onAlertUpdated(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('alert:updated', expect.any(Function));
    });

    it('should call callback when alert is updated', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn();
      const mockAlert = {
        id: 'alert-1',
        ambulanceId: 'amb-1',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7489, lng: -73.9680 },
        message: 'Traffic blockage',
        status: 'cleared' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:05:00Z'
      };

      client.connect(token);
      client.onAlertUpdated(callback);

      // Get the alert handler
      const alertHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'alert:updated'
      )?.[1];

      // Simulate alert updated
      if (alertHandler) {
        alertHandler({ alert: mockAlert });
      }

      expect(callback).toHaveBeenCalledWith(mockAlert);
    });

    it('should allow unsubscribing from alert update events', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn();

      client.connect(token);
      const unsubscribe = client.onAlertUpdated(callback);
      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith('alert:updated', expect.any(Function));
    });
  });

  describe('onLocationUpdate()', () => {
    it('should register listener for location:updated event', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn();

      client.connect(token);
      client.onLocationUpdate(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('location:updated', expect.any(Function));
    });

    it('should call callback when location is updated', () => {
      const token = 'test-jwt-token';
      const callback = jest.fn();
      const mockLocationUpdate = {
        userId: 'amb-1',
        ambulanceId: 'amb-1',
        location: { lat: 40.7128, lng: -74.0060 },
        timestamp: Date.now()
      };

      client.connect(token);
      client.onLocationUpdate(callback);

      // Get the location handler
      const locationHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'location:updated'
      )?.[1];

      // Simulate location update
      if (locationHandler) {
        locationHandler(mockLocationUpdate);
      }

      expect(callback).toHaveBeenCalledWith(mockLocationUpdate);
    });
  });

  describe('emitLocationUpdate()', () => {
    it('should emit location:update event with location data', () => {
      const token = 'test-jwt-token';
      const location = { lat: 40.7128, lng: -74.0060 };

      client.connect(token);
      mockSocket.connected = true;
      client.emitLocationUpdate(location);

      expect(mockSocket.emit).toHaveBeenCalledWith('location:update', { location });
    });

    it('should not emit if socket is not connected', () => {
      const location = { lat: 40.7128, lng: -74.0060 };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      client.emitLocationUpdate(location);

      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Socket not connected, cannot emit location update'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('createAlert()', () => {
    it('should emit alert:create event and return created alert', async () => {
      const token = 'test-jwt-token';
      const alertData = {
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7489, lng: -73.9680 },
        message: 'Traffic blockage'
      };
      const mockAlert = {
        id: 'alert-1',
        ambulanceId: 'amb-1',
        ...alertData,
        status: 'pending' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      client.connect(token);
      mockSocket.connected = true;

      // Mock emit to call callback with success response
      mockSocket.emit.mockImplementation((event: string, data: any, callback: any) => {
        if (event === 'alert:create' && callback) {
          callback({ success: true, alert: mockAlert });
        }
      });

      const result = await client.createAlert(alertData);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'alert:create',
        alertData,
        expect.any(Function)
      );
      expect(result).toEqual(mockAlert);
    });

    it('should reject if socket is not connected', async () => {
      const alertData = {
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7489, lng: -73.9680 },
        message: 'Traffic blockage'
      };

      await expect(client.createAlert(alertData)).rejects.toThrow('Socket not connected');
    });

    it('should reject if server returns error', async () => {
      const token = 'test-jwt-token';
      const alertData = {
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7489, lng: -73.9680 },
        message: 'Traffic blockage'
      };

      client.connect(token);
      mockSocket.connected = true;

      // Mock emit to call callback with error response
      mockSocket.emit.mockImplementation((event: string, data: any, callback: any) => {
        if (event === 'alert:create' && callback) {
          callback({ success: false, error: 'Database error' });
        }
      });

      await expect(client.createAlert(alertData)).rejects.toThrow('Database error');
    });
  });

  describe('updateAlertStatus()', () => {
    it('should emit alert:updateStatus event and return updated alert', async () => {
      const token = 'test-jwt-token';
      const alertId = 'alert-1';
      const status = 'cleared';
      const mockAlert = {
        id: alertId,
        ambulanceId: 'amb-1',
        ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 40.7589, lng: -73.9851 },
        congestionPoint: { lat: 40.7489, lng: -73.9680 },
        message: 'Traffic blockage',
        status: status as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:05:00Z'
      };

      client.connect(token);
      mockSocket.connected = true;

      // Mock emit to call callback with success response
      mockSocket.emit.mockImplementation((event: string, data: any, callback: any) => {
        if (event === 'alert:updateStatus' && callback) {
          callback({ success: true, alert: mockAlert });
        }
      });

      const result = await client.updateAlertStatus(alertId, status as any);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'alert:updateStatus',
        { alertId, status },
        expect.any(Function)
      );
      expect(result).toEqual(mockAlert);
    });

    it('should reject if socket is not connected', async () => {
      await expect(client.updateAlertStatus('alert-1', 'cleared')).rejects.toThrow(
        'Socket not connected'
      );
    });
  });

  describe('getConnectionStatus()', () => {
    it('should return current connection status', () => {
      const status = client.getConnectionStatus();

      expect(status).toEqual({
        connected: false,
        reconnecting: false,
        reconnectAttempts: 0
      });
    });

    it('should reflect connected state', () => {
      const token = 'test-jwt-token';
      client.connect(token);
      mockSocket.connected = true;

      const status = client.getConnectionStatus();

      expect(status.connected).toBe(true);
    });
  });

  describe('Singleton functions', () => {
    it('should return same ambulance client instance', () => {
      const client1 = getAmbulanceClient();
      const client2 = getAmbulanceClient();

      expect(client1).toBe(client2);
    });

    it('should return same police client instance', () => {
      const client1 = getPoliceClient();
      const client2 = getPoliceClient();

      expect(client1).toBe(client2);
    });

    it('should return different instances for ambulance and police', () => {
      const ambulanceClient = getAmbulanceClient();
      const policeClient = getPoliceClient();

      expect(ambulanceClient).not.toBe(policeClient);
    });

    it('should reset clients', () => {
      const client1 = getAmbulanceClient();
      resetClients();
      const client2 = getAmbulanceClient();

      expect(client1).not.toBe(client2);
    });
  });
});
