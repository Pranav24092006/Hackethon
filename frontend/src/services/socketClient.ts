/**
 * Socket.io Client Service
 * 
 * Manages WebSocket connections for real-time communication with the backend.
 * Implements automatic reconnection with exponential backoff, event listeners,
 * and connection state management.
 * 
 * Requirements: 8.1, 8.4
 */

import { io, Socket } from 'socket.io-client';

// Types for events
export interface Alert {
  id: string;
  ambulanceId: string;
  ambulanceLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  congestionPoint: { lat: number; lng: number };
  message: string;
  status: 'pending' | 'dispatched' | 'cleared' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  clearedAt?: string;
}

export interface LocationUpdate {
  userId: string;
  ambulanceId: string;
  location: { lat: number; lng: number };
  timestamp: number;
}

export interface CreateAlertRequest {
  ambulanceLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  congestionPoint: { lat: number; lng: number };
  message: string;
  phoneNumber?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
}

// Reconnection configuration
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * SocketClient class for managing WebSocket connections
 */
export class SocketClient {
  private socket: Socket | null = null;
  private namespace: 'ambulance' | 'police';
  private token: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionStatusCallbacks: Array<(status: ConnectionStatus) => void> = [];
  private isManualDisconnect = false;

  constructor(namespace: 'ambulance' | 'police') {
    this.namespace = namespace;
  }

  /**
   * Connect to the Socket.io server
   * 
   * @param token - JWT authentication token
   * @param serverUrl - Server URL (defaults to current host)
   */
  connect(token: string, serverUrl?: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.token = token;
    this.isManualDisconnect = false;

    // Determine server URL
    const url = serverUrl || window.location.origin;
    const fullUrl = `${url}/${this.namespace}`;

    console.log(`Connecting to ${fullUrl}...`);

    // Create socket connection with authentication
    this.socket = io(fullUrl, {
      auth: {
        token: this.token
      },
      autoConnect: true,
      reconnection: false, // We'll handle reconnection manually
      transports: ['websocket', 'polling']
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up internal event handlers for connection management
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.notifyConnectionStatus({
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0
      });
    });

    // Connection confirmation from server
    this.socket.on('connected', (data: any) => {
      console.log('Connection confirmed:', data);
    });

    // Disconnection
    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      this.notifyConnectionStatus({
        connected: false,
        reconnecting: !this.isManualDisconnect,
        reconnectAttempts: this.reconnectAttempts
      });

      // Attempt reconnection if not manually disconnected
      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error.message);
      this.notifyConnectionStatus({
        connected: false,
        reconnecting: true,
        reconnectAttempts: this.reconnectAttempts
      });

      // Attempt reconnection
      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    });

    // Heartbeat from server
    this.socket.on('heartbeat', (data: { timestamp: number }) => {
      // Respond to heartbeat to keep connection alive
      console.debug('Heartbeat received:', data.timestamp);
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isManualDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.notifyConnectionStatus({
        connected: false,
        reconnecting: false,
        reconnectAttempts: this.reconnectAttempts
      });
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.attemptReconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect(): void {
    if (!this.token || this.isManualDisconnect) {
      return;
    }

    console.log('Attempting to reconnect...');
    
    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
    }

    // Create new connection
    this.connect(this.token);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Notify all connection status callbacks
   */
  private notifyConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }

    this.notifyConnectionStatus({
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0
    });

    console.log('Socket disconnected manually');
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Listen for connection status changes
   * 
   * @param callback - Function to call when connection status changes
   * @returns Unsubscribe function
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionStatusCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.connectionStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionStatusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Listen for alert received events (Police)
   * 
   * @param callback - Function to call when alert is received
   * @returns Unsubscribe function
   */
  onAlertReceived(callback: (alert: Alert) => void): () => void {
    if (!this.socket) {
      console.warn('Socket not connected, cannot listen for alerts');
      return () => {};
    }

    const handler = (data: { alert: Alert }) => {
      try {
        callback(data.alert);
      } catch (error) {
        console.error('Error in alert received callback:', error);
      }
    };

    this.socket.on('alert:created', handler);

    // Return unsubscribe function
    return () => {
      this.socket?.off('alert:created', handler);
    };
  }

  /**
   * Listen for alert updated events (Ambulance)
   * 
   * @param callback - Function to call when alert is updated
   * @returns Unsubscribe function
   */
  onAlertUpdated(callback: (alert: Alert) => void): () => void {
    if (!this.socket) {
      console.warn('Socket not connected, cannot listen for alert updates');
      return () => {};
    }

    const handler = (data: { alert: Alert }) => {
      try {
        callback(data.alert);
      } catch (error) {
        console.error('Error in alert updated callback:', error);
      }
    };

    this.socket.on('alert:updated', handler);

    // Return unsubscribe function
    return () => {
      this.socket?.off('alert:updated', handler);
    };
  }

  /**
   * Listen for location update events (Police)
   * 
   * @param callback - Function to call when location is updated
   * @returns Unsubscribe function
   */
  onLocationUpdate(callback: (update: LocationUpdate) => void): () => void {
    if (!this.socket) {
      console.warn('Socket not connected, cannot listen for location updates');
      return () => {};
    }

    const handler = (data: LocationUpdate) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in location update callback:', error);
      }
    };

    this.socket.on('location:updated', handler);

    // Return unsubscribe function
    return () => {
      this.socket?.off('location:updated', handler);
    };
  }

  /**
   * Emit location update (Ambulance)
   * 
   * @param location - Current location coordinates
   */
  emitLocationUpdate(location: { lat: number; lng: number }): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot emit location update');
      return;
    }

    this.socket.emit('location:update', { location });
  }

  /**
   * Create an alert (Ambulance)
   * 
   * @param alertData - Alert data
   * @returns Promise that resolves with the created alert
   */
  createAlert(alertData: CreateAlertRequest): Promise<Alert> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('alert:create', alertData, (response: any) => {
        if (response.success) {
          resolve(response.alert);
        } else {
          reject(new Error(response.error || 'Failed to create alert'));
        }
      });
    });
  }

  /**
   * Update alert status (Police)
   * 
   * @param alertId - Alert ID
   * @param status - New status
   * @returns Promise that resolves with the updated alert
   */
  updateAlertStatus(alertId: string, status: Alert['status']): Promise<Alert> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('alert:updateStatus', { alertId, status }, (response: any) => {
        if (response.success) {
          resolve(response.alert);
        } else {
          reject(new Error(response.error || 'Failed to update alert status'));
        }
      });
    });
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.isConnected(),
      reconnecting: this.reconnectTimer !== null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Singleton instances for ambulance and police
let ambulanceClient: SocketClient | null = null;
let policeClient: SocketClient | null = null;

/**
 * Get or create ambulance socket client
 */
export function getAmbulanceClient(): SocketClient {
  if (!ambulanceClient) {
    ambulanceClient = new SocketClient('ambulance');
  }
  return ambulanceClient;
}

/**
 * Get or create police socket client
 */
export function getPoliceClient(): SocketClient {
  if (!policeClient) {
    policeClient = new SocketClient('police');
  }
  return policeClient;
}

/**
 * Reset clients (for testing)
 */
export function resetClients(): void {
  if (ambulanceClient) {
    ambulanceClient.disconnect();
    ambulanceClient = null;
  }
  if (policeClient) {
    policeClient.disconnect();
    policeClient = null;
  }
}
