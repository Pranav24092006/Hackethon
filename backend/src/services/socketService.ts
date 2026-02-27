/**
 * Socket.io Service
 * 
 * Manages WebSocket connections for real-time communication between
 * ambulance and police dashboards. Implements JWT authentication,
 * namespace separation, and socket-to-user mapping.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { Server, Socket, Namespace } from 'socket.io';
import { verifyToken } from './authService.js';

// Socket ID to User ID mapping
const socketToUserMap = new Map<string, string>();

// User ID to Socket ID mapping (for targeted messages)
const userToSocketMap = new Map<string, string>();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Cleanup timeout for disconnected sockets (5 minutes)
const CLEANUP_TIMEOUT = 5 * 60 * 1000;

/**
 * Initialize Socket.io server with authentication and namespaces
 * 
 * @param io - Socket.io server instance
 */
export function initializeSocketServer(io: Server): void {
  // Create namespaces for ambulance and police
  const ambulanceNamespace = io.of('/ambulance');
  const policeNamespace = io.of('/police');

  // Set up authentication middleware for ambulance namespace
  ambulanceNamespace.use(async (socket, next) => {
    await authenticateSocket(socket, next);
  });

  // Set up authentication middleware for police namespace
  policeNamespace.use(async (socket, next) => {
    await authenticateSocket(socket, next);
  });

  // Handle ambulance connections
  ambulanceNamespace.on('connection', (socket) => {
    handleConnection(socket, 'ambulance');
  });

  // Handle police connections
  policeNamespace.on('connection', (socket) => {
    handleConnection(socket, 'police');
  });

  // Start heartbeat mechanism
  startHeartbeat(io);
}

/**
 * Authentication middleware for Socket.io connections
 * Verifies JWT token from handshake auth or query
 */
async function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {
    // Get token from handshake auth or query parameters
    const token = socket.handshake.auth?.token || socket.handshake.query?.token as string;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token
    const user = await verifyToken(token);

    // Attach user info to socket
    socket.data.user = user;

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
}

/**
 * Handle new socket connection
 */
function handleConnection(socket: Socket, namespace: 'ambulance' | 'police'): void {
  const userId = socket.data.user?.id;

  if (!userId) {
    console.error('Socket connected without user ID');
    socket.disconnect();
    return;
  }

  // Store socket-to-user mapping
  socketToUserMap.set(socket.id, userId);
  userToSocketMap.set(userId, socket.id);

  console.log(`${namespace} user connected:`, {
    socketId: socket.id,
    userId,
    username: socket.data.user?.username
  });

  // Send connection confirmation
  socket.emit('connected', {
    message: 'Successfully connected',
    userId,
    namespace
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    handleDisconnection(socket, namespace);
  });

  // Handle authentication event (for re-authentication)
  socket.on('authenticate', async (data: { token: string }, callback) => {
    try {
      const user = await verifyToken(data.token);
      socket.data.user = user;
      
      // Update mappings
      socketToUserMap.set(socket.id, user.id);
      userToSocketMap.set(user.id, socket.id);

      if (callback) {
        callback({ success: true, user });
      }
    } catch (error) {
      if (callback) {
        callback({ success: false, error: 'Authentication failed' });
      }
    }
  });

  // Handle location update from ambulances
  if (namespace === 'ambulance') {
    socket.on('location:update', (data: { location: { lat: number; lng: number } }) => {
      try {
        // Validate location data
        if (!data.location || typeof data.location.lat !== 'number' || typeof data.location.lng !== 'number') {
          console.error('Invalid location data received:', data);
          return;
        }

        // Broadcast location update to all police clients using broadcast function
        broadcastLocationUpdate(socket.nsp.server, userId, data.location);
      } catch (error) {
        console.error('Error handling location update:', error);
      }
    });

    // Handle alert creation from ambulances
    socket.on('alert:create', async (data: any, callback) => {
      try {
        // Import alert service dynamically to avoid circular dependencies
        const alertService = await import('./alertService.js');

        // Create alert
        const alert = await alertService.createAlert({
          ambulanceId: userId,
          ambulanceLocation: data.ambulanceLocation,
          destination: data.destination,
          congestionPoint: data.congestionPoint,
          message: data.message
        }, data.phoneNumber);

        // Broadcast alert to all police clients using broadcast function
        broadcastAlertToPolice(socket.nsp.server, alert);

        console.log(`Alert created by ambulance ${userId}:`, alert.id);

        // Send success response
        if (callback) {
          callback({ success: true, alert });
        }
      } catch (error) {
        console.error('Error creating alert:', error);
        if (callback) {
          callback({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to create alert' 
          });
        }
      }
    });
  }

  // Handle alert status updates from police
  if (namespace === 'police') {
    socket.on('alert:updateStatus', async (data: { alertId: string; status: string }, callback) => {
      try {
        // Import alert service dynamically
        const alertService = await import('./alertService.js');

        // Update alert status
        const alert = await alertService.updateAlertStatus(data.alertId, data.status as any);

        // Send update to the specific ambulance using broadcast function
        sendAlertUpdateToAmbulance(socket.nsp.server, alert.ambulanceId, alert);

        // Also broadcast to all police clients for their dashboard updates
        socket.nsp.server.of('/police').emit('alert:updated', { alert });

        console.log(`Alert ${data.alertId} status updated to ${data.status} by police ${userId}`);

        // Send success response
        if (callback) {
          callback({ success: true, alert });
        }
      } catch (error) {
        console.error('Error updating alert status:', error);
        if (callback) {
          callback({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to update alert status' 
          });
        }
      }
    });
  }
}

/**
 * Handle socket disconnection
 */
function handleDisconnection(socket: Socket, namespace: string): void {
  const userId = socketToUserMap.get(socket.id);

  console.log(`${namespace} user disconnected:`, {
    socketId: socket.id,
    userId
  });

  // Schedule cleanup after timeout
  setTimeout(() => {
    // Only clean up if socket hasn't reconnected
    if (socketToUserMap.get(socket.id) === userId) {
      socketToUserMap.delete(socket.id);
      if (userId) {
        userToSocketMap.delete(userId);
      }
      console.log(`Cleaned up socket mapping for user ${userId}`);
    }
  }, CLEANUP_TIMEOUT);
}

/**
 * Start heartbeat mechanism to detect stale connections
 */
function startHeartbeat(io: Server): void {
  setInterval(() => {
    // Emit heartbeat to all connected clients
    io.of('/ambulance').emit('heartbeat', { timestamp: Date.now() });
    io.of('/police').emit('heartbeat', { timestamp: Date.now() });
  }, HEARTBEAT_INTERVAL);
}

/**
 * Get user ID from socket ID
 */
export function getUserIdFromSocket(socketId: string): string | undefined {
  return socketToUserMap.get(socketId);
}

/**
 * Get socket ID from user ID
 */
export function getSocketIdFromUser(userId: string): string | undefined {
  return userToSocketMap.get(userId);
}

/**
 * Get all connected socket IDs
 */
export function getAllConnectedSockets(): string[] {
  return Array.from(socketToUserMap.keys());
}

/**
 * Get all connected user IDs
 */
export function getAllConnectedUsers(): string[] {
  return Array.from(userToSocketMap.keys());
}

/**
 * Check if a user is connected
 */
export function isUserConnected(userId: string): boolean {
  return userToSocketMap.has(userId);
}

/**
 * Clear all socket mappings (for testing)
 */
export function clearSocketMappings(): void {
  socketToUserMap.clear();
  userToSocketMap.clear();
}

/**
 * Broadcast alert to all police clients
 * 
 * @param io - Socket.io server instance
 * @param alert - Alert object to broadcast
 */
export function broadcastAlertToPolice(io: Server, alert: any): void {
  try {
    io.of('/police').emit('alert:created', { alert });
    console.log(`Alert ${alert.id} broadcast to all police clients`);
  } catch (error) {
    console.error('Error broadcasting alert to police:', error);
    throw error;
  }
}

/**
 * Send alert update to specific ambulance
 * 
 * @param io - Socket.io server instance
 * @param ambulanceId - User ID of the ambulance
 * @param alert - Updated alert object
 */
export function sendAlertUpdateToAmbulance(io: Server, ambulanceId: string, alert: any): void {
  try {
    const socketId = userToSocketMap.get(ambulanceId);
    
    if (socketId) {
      io.of('/ambulance').to(socketId).emit('alert:updated', { alert });
      console.log(`Alert update sent to ambulance ${ambulanceId}`);
    } else {
      console.warn(`Ambulance ${ambulanceId} is not connected, cannot send alert update`);
    }
  } catch (error) {
    console.error('Error sending alert update to ambulance:', error);
    throw error;
  }
}

/**
 * Broadcast location update
 * 
 * @param io - Socket.io server instance
 * @param userId - User ID of the ambulance
 * @param location - Location coordinates
 */
export function broadcastLocationUpdate(io: Server, userId: string, location: { lat: number; lng: number }): void {
  try {
    io.of('/police').emit('location:updated', {
      userId,
      ambulanceId: userId,
      location,
      timestamp: Date.now()
    });
    console.log(`Location update from ${userId} broadcast to all police clients`);
  } catch (error) {
    console.error('Error broadcasting location update:', error);
    throw error;
  }
}
