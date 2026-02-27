/**
 * Unit tests for Socket.io Service
 * 
 * Tests WebSocket connection handling, authentication, namespaces,
 * and socket-to-user mapping functionality.
 * 
 * Note: Run 'npm install' in the backend directory to install dependencies
 * and resolve TypeScript errors.
 */

// @ts-nocheck - Suppress TypeScript errors until dependencies are installed
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import {
  initializeSocketServer,
  getUserIdFromSocket,
  getSocketIdFromUser,
  getAllConnectedSockets,
  getAllConnectedUsers,
  isUserConnected,
  clearSocketMappings
} from '../socketService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const TEST_PORT = 3001;

describe('SocketService', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketIOServer;
  let serverUrl: string;

  beforeEach((done: jest.DoneCallback) => {
    // Clear socket mappings before each test
    clearSocketMappings();

    // Create HTTP server and Socket.io instance
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Initialize socket server with authentication
    initializeSocketServer(io);

    // Start server
    httpServer.listen(TEST_PORT, () => {
      serverUrl = `http://localhost:${TEST_PORT}`;
      done();
    });
  });

  afterEach((done: jest.DoneCallback) => {
    // Close all connections
    io.close();
    httpServer.close(() => {
      clearSocketMappings();
      done();
    });
  });

  describe('Authentication', () => {
    it('should reject connection without token', (done: jest.DoneCallback) => {
      const client = ioClient(`${serverUrl}/ambulance`, {
        autoConnect: true
      });

      client.on('connect_error', (error: Error) => {
        expect(error.message).toContain('Authentication');
        client.close();
        done();
      });

      client.on('connect', () => {
        client.close();
        done(new Error('Should not connect without token'));
      });
    });

    it('should reject connection with invalid token', (done: jest.DoneCallback) => {
      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: {
          token: 'invalid-token'
        }
      });

      client.on('connect_error', (error: Error) => {
        expect(error.message).toContain('Authentication failed');
        client.close();
        done();
      });

      client.on('connect', () => {
        client.close();
        done(new Error('Should not connect with invalid token'));
      });
    });

    it('should accept connection with valid token', (done: jest.DoneCallback) => {
      const token = jwt.sign(
        {
          userId: 'user-123',
          username: 'testuser',
          role: 'ambulance'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: {
          token
        }
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.close();
        done();
      });

      client.on('connect_error', (error: Error) => {
        client.close();
        done(error);
      });
    });

    it('should accept token from query parameters', (done: jest.DoneCallback) => {
      const token = jwt.sign(
        {
          userId: 'user-456',
          username: 'testuser2',
          role: 'police'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/police`, {
        query: {
          token
        }
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.close();
        done();
      });

      client.on('connect_error', (error: Error) => {
        client.close();
        done(error);
      });
    });

    it('should reject expired token', (done: jest.DoneCallback) => {
      const token = jwt.sign(
        {
          userId: 'user-789',
          username: 'expireduser',
          role: 'ambulance'
        },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: {
          token
        }
      });

      client.on('connect_error', (error: Error) => {
        expect(error.message).toContain('Authentication failed');
        client.close();
        done();
      });

      client.on('connect', () => {
        client.close();
        done(new Error('Should not connect with expired token'));
      });
    });
  });

  describe('Namespaces', () => {
    it('should connect to ambulance namespace', (done: jest.DoneCallback) => {
      const token = jwt.sign(
        {
          userId: 'ambulance-user',
          username: 'ambulance1',
          role: 'ambulance'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: { token }
      });

      client.on('connected', (data: { namespace: string; userId: string }) => {
        expect(data.namespace).toBe('ambulance');
        expect(data.userId).toBe('ambulance-user');
        client.close();
        done();
      });

      client.on('connect_error', (error: Error) => {
        client.close();
        done(error);
      });
    });

    it('should connect to police namespace', (done: jest.DoneCallback) => {
      const token = jwt.sign(
        {
          userId: 'police-user',
          username: 'police1',
          role: 'police'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/police`, {
        auth: { token }
      });

      client.on('connected', (data: { namespace: string; userId: string }) => {
        expect(data.namespace).toBe('police');
        expect(data.userId).toBe('police-user');
        client.close();
        done();
      });

      client.on('connect_error', (error: Error) => {
        client.close();
        done(error);
      });
    });

    it('should maintain separate connections for different namespaces', (done: jest.DoneCallback) => {
      const ambulanceToken = jwt.sign(
        { userId: 'amb-1', username: 'amb1', role: 'ambulance' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const policeToken = jwt.sign(
        { userId: 'pol-1', username: 'pol1', role: 'police' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const ambulanceClient = ioClient(`${serverUrl}/ambulance`, {
        auth: { token: ambulanceToken }
      });

      const policeClient = ioClient(`${serverUrl}/police`, {
        auth: { token: policeToken }
      });

      let ambulanceConnected = false;
      let policeConnected = false;

      ambulanceClient.on('connected', (data: { namespace: string }) => {
        expect(data.namespace).toBe('ambulance');
        ambulanceConnected = true;
        checkBothConnected();
      });

      policeClient.on('connected', (data: { namespace: string }) => {
        expect(data.namespace).toBe('police');
        policeConnected = true;
        checkBothConnected();
      });

      function checkBothConnected() {
        if (ambulanceConnected && policeConnected) {
          ambulanceClient.close();
          policeClient.close();
          done();
        }
      }
    });
  });

  describe('Socket-to-User Mapping', () => {
    it('should store socket ID to user ID mapping on connection', (done: jest.DoneCallback) => {
      const userId = 'map-test-user';
      const token = jwt.sign(
        { userId, username: 'maptest', role: 'ambulance' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: { token }
      });

      client.on('connect', () => {
        // Give it a moment to process
        setTimeout(() => {
          const retrievedUserId = getUserIdFromSocket(client.id);
          expect(retrievedUserId).toBe(userId);

          const retrievedSocketId = getSocketIdFromUser(userId);
          expect(retrievedSocketId).toBe(client.id);

          client.close();
          done();
        }, 100);
      });
    });

    it('should track multiple connected users', (done: jest.DoneCallback) => {
      const user1Token = jwt.sign(
        { userId: 'user-1', username: 'user1', role: 'ambulance' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const user2Token = jwt.sign(
        { userId: 'user-2', username: 'user2', role: 'police' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client1 = ioClient(`${serverUrl}/ambulance`, {
        auth: { token: user1Token }
      });

      const client2 = ioClient(`${serverUrl}/police`, {
        auth: { token: user2Token }
      });

      let client1Connected = false;
      let client2Connected = false;

      client1.on('connect', () => {
        client1Connected = true;
        checkBothConnected();
      });

      client2.on('connect', () => {
        client2Connected = true;
        checkBothConnected();
      });

      function checkBothConnected() {
        if (client1Connected && client2Connected) {
          setTimeout(() => {
            const connectedUsers = getAllConnectedUsers();
            expect(connectedUsers).toContain('user-1');
            expect(connectedUsers).toContain('user-2');
            expect(connectedUsers.length).toBe(2);

            const connectedSockets = getAllConnectedSockets();
            expect(connectedSockets.length).toBe(2);

            client1.close();
            client2.close();
            done();
          }, 100);
        }
      }
    });

    it('should check if user is connected', (done: jest.DoneCallback) => {
      const userId = 'connection-check-user';
      const token = jwt.sign(
        { userId, username: 'checkuser', role: 'ambulance' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: { token }
      });

      client.on('connect', () => {
        setTimeout(() => {
          expect(isUserConnected(userId)).toBe(true);
          expect(isUserConnected('non-existent-user')).toBe(false);

          client.close();
          done();
        }, 100);
      });
    });
  });

  describe('Heartbeat', () => {
    it('should emit heartbeat events periodically', (done: jest.DoneCallback) => {
      const token = jwt.sign(
        { userId: 'heartbeat-user', username: 'hbuser', role: 'ambulance' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: { token }
      });

      let heartbeatReceived = false;

      client.on('heartbeat', (data: { timestamp: number }) => {
        expect(data.timestamp).toBeDefined();
        expect(typeof data.timestamp).toBe('number');
        heartbeatReceived = true;
        client.close();
        done();
      });

      // Heartbeat is every 30 seconds, but we'll wait max 35 seconds
      setTimeout(() => {
        if (!heartbeatReceived) {
          client.close();
          done(new Error('Heartbeat not received within timeout'));
        }
      }, 35000);
    }, 40000); // Increase test timeout to 40 seconds
  });

  describe('Re-authentication', () => {
    it('should allow re-authentication with new token', (done: jest.DoneCallback) => {
      const initialToken = jwt.sign(
        { userId: 'reauth-user', username: 'initial', role: 'ambulance' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: { token: initialToken }
      });

      client.on('connect', () => {
        const newToken = jwt.sign(
          { userId: 'reauth-user-new', username: 'updated', role: 'ambulance' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        client.emit('authenticate', { token: newToken }, (response: { success: boolean; user?: { id: string; username: string }; error?: string }) => {
          expect(response.success).toBe(true);
          expect(response.user?.id).toBe('reauth-user-new');
          expect(response.user?.username).toBe('updated');

          // Check that mapping was updated
          setTimeout(() => {
            const userId = getUserIdFromSocket(client.id);
            expect(userId).toBe('reauth-user-new');

            client.close();
            done();
          }, 100);
        });
      });
    });

    it('should reject re-authentication with invalid token', (done: jest.DoneCallback) => {
      const initialToken = jwt.sign(
        { userId: 'reauth-fail-user', username: 'initial', role: 'police' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/police`, {
        auth: { token: initialToken }
      });

      client.on('connect', () => {
        client.emit('authenticate', { token: 'invalid-token' }, (response: { success: boolean; error?: string }) => {
          expect(response.success).toBe(false);
          expect(response.error).toBe('Authentication failed');

          client.close();
          done();
        });
      });
    });
  });

  describe('Disconnection', () => {
    it('should handle client disconnection', (done: jest.DoneCallback) => {
      const userId = 'disconnect-user';
      const token = jwt.sign(
        { userId, username: 'discuser', role: 'ambulance' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const client = ioClient(`${serverUrl}/ambulance`, {
        auth: { token }
      });

      client.on('connect', () => {
        setTimeout(() => {
          expect(isUserConnected(userId)).toBe(true);

          // Disconnect client
          client.close();

          // Mapping should still exist immediately after disconnect
          // (cleanup happens after 5 minutes)
          setTimeout(() => {
            const socketId = getSocketIdFromUser(userId);
            expect(socketId).toBeDefined();
            done();
          }, 100);
        }, 100);
      });
    });
  });

  describe('Event Handlers', () => {
    describe('location:update', () => {
      it('should broadcast ambulance location updates to police clients', (done: jest.DoneCallback) => {
        const ambulanceToken = jwt.sign(
          { userId: 'ambulance-123', username: 'amb1', role: 'ambulance' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const policeToken = jwt.sign(
          { userId: 'police-456', username: 'pol1', role: 'police' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const ambulanceClient = ioClient(`${serverUrl}/ambulance`, {
          auth: { token: ambulanceToken }
        });

        const policeClient = ioClient(`${serverUrl}/police`, {
          auth: { token: policeToken }
        });

        let ambulanceConnected = false;
        let policeConnected = false;

        ambulanceClient.on('connect', () => {
          ambulanceConnected = true;
          checkBothConnected();
        });

        policeClient.on('connect', () => {
          policeConnected = true;
          checkBothConnected();
        });

        function checkBothConnected() {
          if (ambulanceConnected && policeConnected) {
            // Police client listens for location updates
            policeClient.on('location:updated', (data: any) => {
              expect(data.userId).toBe('ambulance-123');
              expect(data.ambulanceId).toBe('ambulance-123');
              expect(data.location).toEqual({ lat: 40.7128, lng: -74.0060 });
              expect(data.timestamp).toBeDefined();

              ambulanceClient.close();
              policeClient.close();
              done();
            });

            // Ambulance emits location update
            setTimeout(() => {
              ambulanceClient.emit('location:update', {
                location: { lat: 40.7128, lng: -74.0060 }
              });
            }, 100);
          }
        }
      });

      it('should reject invalid location data', (done: jest.DoneCallback) => {
        const ambulanceToken = jwt.sign(
          { userId: 'ambulance-invalid', username: 'amb2', role: 'ambulance' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const policeToken = jwt.sign(
          { userId: 'police-observer', username: 'pol2', role: 'police' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const ambulanceClient = ioClient(`${serverUrl}/ambulance`, {
          auth: { token: ambulanceToken }
        });

        const policeClient = ioClient(`${serverUrl}/police`, {
          auth: { token: policeToken }
        });

        let ambulanceConnected = false;
        let policeConnected = false;
        let locationUpdateReceived = false;

        ambulanceClient.on('connect', () => {
          ambulanceConnected = true;
          checkBothConnected();
        });

        policeClient.on('connect', () => {
          policeConnected = true;
          checkBothConnected();
        });

        function checkBothConnected() {
          if (ambulanceConnected && policeConnected) {
            // Police client listens for location updates
            policeClient.on('location:updated', () => {
              locationUpdateReceived = true;
            });

            // Ambulance emits invalid location update
            setTimeout(() => {
              ambulanceClient.emit('location:update', {
                location: { lat: 'invalid', lng: 'invalid' }
              });

              // Wait to ensure no update was broadcast
              setTimeout(() => {
                expect(locationUpdateReceived).toBe(false);
                ambulanceClient.close();
                policeClient.close();
                done();
              }, 500);
            }, 100);
          }
        }
      });
    });

    describe('alert:create', () => {
      it('should create alert and broadcast to police clients', (done: jest.DoneCallback) => {
        const ambulanceToken = jwt.sign(
          { userId: 'ambulance-alert', username: 'amb3', role: 'ambulance' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const policeToken = jwt.sign(
          { userId: 'police-alert', username: 'pol3', role: 'police' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const ambulanceClient = ioClient(`${serverUrl}/ambulance`, {
          auth: { token: ambulanceToken }
        });

        const policeClient = ioClient(`${serverUrl}/police`, {
          auth: { token: policeToken }
        });

        let ambulanceConnected = false;
        let policeConnected = false;

        ambulanceClient.on('connect', () => {
          ambulanceConnected = true;
          checkBothConnected();
        });

        policeClient.on('connect', () => {
          policeConnected = true;
          checkBothConnected();
        });

        function checkBothConnected() {
          if (ambulanceConnected && policeConnected) {
            // Police client listens for alerts
            policeClient.on('alert:created', (data: any) => {
              expect(data.alert).toBeDefined();
              expect(data.alert.ambulanceId).toBe('ambulance-alert');
              expect(data.alert.message).toBe('Traffic congestion ahead');
              expect(data.alert.status).toBe('pending');

              ambulanceClient.close();
              policeClient.close();
              done();
            });

            // Ambulance creates alert
            setTimeout(() => {
              ambulanceClient.emit('alert:create', {
                ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
                destination: { lat: 40.7580, lng: -73.9855 },
                congestionPoint: { lat: 40.7300, lng: -74.0000 },
                message: 'Traffic congestion ahead'
              }, (response: any) => {
                expect(response.success).toBe(true);
                expect(response.alert).toBeDefined();
              });
            }, 100);
          }
        }
      });

      it('should handle alert creation errors', (done: jest.DoneCallback) => {
        const ambulanceToken = jwt.sign(
          { userId: 'ambulance-error', username: 'amb4', role: 'ambulance' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const ambulanceClient = ioClient(`${serverUrl}/ambulance`, {
          auth: { token: ambulanceToken }
        });

        ambulanceClient.on('connect', () => {
          // Emit alert with missing required fields
          ambulanceClient.emit('alert:create', {
            ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
            // Missing destination, congestionPoint, and message
          }, (response: any) => {
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();

            ambulanceClient.close();
            done();
          });
        });
      });
    });

    describe('alert:updateStatus', () => {
      it('should update alert status and notify ambulance', (done: jest.DoneCallback) => {
        const ambulanceToken = jwt.sign(
          { userId: 'ambulance-status', username: 'amb5', role: 'ambulance' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const policeToken = jwt.sign(
          { userId: 'police-status', username: 'pol5', role: 'police' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const ambulanceClient = ioClient(`${serverUrl}/ambulance`, {
          auth: { token: ambulanceToken }
        });

        const policeClient = ioClient(`${serverUrl}/police`, {
          auth: { token: policeToken }
        });

        let ambulanceConnected = false;
        let policeConnected = false;
        let alertId: string;

        ambulanceClient.on('connect', () => {
          ambulanceConnected = true;
          checkBothConnected();
        });

        policeClient.on('connect', () => {
          policeConnected = true;
          checkBothConnected();
        });

        function checkBothConnected() {
          if (ambulanceConnected && policeConnected) {
            // First, create an alert
            policeClient.on('alert:created', (data: any) => {
              alertId = data.alert.id;

              // Ambulance listens for status updates
              ambulanceClient.on('alert:updated', (updateData: any) => {
                expect(updateData.alert.id).toBe(alertId);
                expect(updateData.alert.status).toBe('dispatched');

                ambulanceClient.close();
                policeClient.close();
                done();
              });

              // Police updates alert status
              setTimeout(() => {
                policeClient.emit('alert:updateStatus', {
                  alertId,
                  status: 'dispatched'
                }, (response: any) => {
                  expect(response.success).toBe(true);
                  expect(response.alert.status).toBe('dispatched');
                });
              }, 100);
            });

            // Create alert
            setTimeout(() => {
              ambulanceClient.emit('alert:create', {
                ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
                destination: { lat: 40.7580, lng: -73.9855 },
                congestionPoint: { lat: 40.7300, lng: -74.0000 },
                message: 'Need assistance'
              });
            }, 100);
          }
        }
      }, 10000); // Increase timeout for this complex test

      it('should handle invalid alert ID', (done: jest.DoneCallback) => {
        const policeToken = jwt.sign(
          { userId: 'police-invalid', username: 'pol6', role: 'police' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const policeClient = ioClient(`${serverUrl}/police`, {
          auth: { token: policeToken }
        });

        policeClient.on('connect', () => {
          policeClient.emit('alert:updateStatus', {
            alertId: 'non-existent-alert-id',
            status: 'dispatched'
          }, (response: any) => {
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();

            policeClient.close();
            done();
          });
        });
      });
    });
  });

  describe('Broadcast Functions', () => {
    describe('broadcastAlertToPolice', () => {
      it('should broadcast alert to all connected police clients', (done: jest.DoneCallback) => {
        const { broadcastAlertToPolice } = require('../socketService.js');
        
        const policeToken1 = jwt.sign(
          { userId: 'police-1', username: 'pol1', role: 'police' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const policeToken2 = jwt.sign(
          { userId: 'police-2', username: 'pol2', role: 'police' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const policeClient1 = ioClient(`${serverUrl}/police`, {
          auth: { token: policeToken1 }
        });

        const policeClient2 = ioClient(`${serverUrl}/police`, {
          auth: { token: policeToken2 }
        });

        let client1Connected = false;
        let client2Connected = false;
        let client1Received = false;
        let client2Received = false;

        const mockAlert = {
          id: 'alert-123',
          ambulanceId: 'amb-1',
          message: 'Test alert',
          status: 'pending'
        };

        policeClient1.on('connect', () => {
          client1Connected = true;
          checkBothConnected();
        });

        policeClient2.on('connect', () => {
          client2Connected = true;
          checkBothConnected();
        });

        policeClient1.on('alert:created', (data: any) => {
          expect(data.alert).toEqual(mockAlert);
          client1Received = true;
          checkBothReceived();
        });

        policeClient2.on('alert:created', (data: any) => {
          expect(data.alert).toEqual(mockAlert);
          client2Received = true;
          checkBothReceived();
        });

        function checkBothConnected() {
          if (client1Connected && client2Connected) {
            setTimeout(() => {
              broadcastAlertToPolice(io, mockAlert);
            }, 100);
          }
        }

        function checkBothReceived() {
          if (client1Received && client2Received) {
            policeClient1.close();
            policeClient2.close();
            done();
          }
        }
      });
    });

    describe('sendAlertUpdateToAmbulance', () => {
      it('should send alert update to specific ambulance', (done: jest.DoneCallback) => {
        const { sendAlertUpdateToAmbulance } = require('../socketService.js');
        
        const ambulanceToken = jwt.sign(
          { userId: 'ambulance-target', username: 'amb1', role: 'ambulance' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const ambulanceClient = ioClient(`${serverUrl}/ambulance`, {
          auth: { token: ambulanceToken }
        });

        const mockAlert = {
          id: 'alert-456',
          ambulanceId: 'ambulance-target',
          message: 'Updated alert',
          status: 'dispatched'
        };

        ambulanceClient.on('connect', () => {
          setTimeout(() => {
            sendAlertUpdateToAmbulance(io, 'ambulance-target', mockAlert);
          }, 100);
        });

        ambulanceClient.on('alert:updated', (data: any) => {
          expect(data.alert).toEqual(mockAlert);
          ambulanceClient.close();
          done();
        });
      });

      it('should handle sending to disconnected ambulance gracefully', (done: jest.DoneCallback) => {
        const { sendAlertUpdateToAmbulance } = require('../socketService.js');
        
        const mockAlert = {
          id: 'alert-789',
          ambulanceId: 'non-existent-ambulance',
          message: 'Test alert',
          status: 'pending'
        };

        // Should not throw error
        expect(() => {
          sendAlertUpdateToAmbulance(io, 'non-existent-ambulance', mockAlert);
        }).not.toThrow();

        done();
      });
    });

    describe('broadcastLocationUpdate', () => {
      it('should broadcast location update to all police clients', (done: jest.DoneCallback) => {
        const { broadcastLocationUpdate } = require('../socketService.js');
        
        const policeToken = jwt.sign(
          { userId: 'police-location', username: 'pol1', role: 'police' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const policeClient = ioClient(`${serverUrl}/police`, {
          auth: { token: policeToken }
        });

        const mockLocation = { lat: 40.7128, lng: -74.0060 };
        const ambulanceId = 'ambulance-123';

        policeClient.on('connect', () => {
          setTimeout(() => {
            broadcastLocationUpdate(io, ambulanceId, mockLocation);
          }, 100);
        });

        policeClient.on('location:updated', (data: any) => {
          expect(data.userId).toBe(ambulanceId);
          expect(data.ambulanceId).toBe(ambulanceId);
          expect(data.location).toEqual(mockLocation);
          expect(data.timestamp).toBeDefined();
          policeClient.close();
          done();
        });
      });
    });
  });
});
