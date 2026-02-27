# Socket.io Client Service

This service manages WebSocket connections for real-time communication between the frontend and backend.

## Features

- **Automatic Reconnection**: Implements exponential backoff strategy (1s, 2s, 4s, 8s, max 30s)
- **Connection State Management**: Track connection status and reconnection attempts
- **Event Listeners**: Subscribe to alerts, location updates, and connection status changes
- **Event Emitters**: Send location updates and create/update alerts
- **Namespace Support**: Separate clients for ambulance and police dashboards
- **Type Safety**: Full TypeScript support with typed events and callbacks

## Usage

### Ambulance Dashboard

```typescript
import { getAmbulanceClient } from '@/services/socketClient';

// Get the ambulance client instance
const client = getAmbulanceClient();

// Connect with JWT token
client.connect(authToken);

// Listen for connection status changes
const unsubscribe = client.onConnectionStatusChange((status) => {
  console.log('Connection status:', status);
  // status: { connected: boolean, reconnecting: boolean, reconnectAttempts: number }
});

// Listen for alert updates
client.onAlertUpdated((alert) => {
  console.log('Alert updated:', alert);
  // Show notification to user
});

// Emit location updates
setInterval(() => {
  const location = getCurrentLocation(); // Get from GPS or simulation
  client.emitLocationUpdate(location);
}, 5000); // Every 5 seconds

// Create an alert
try {
  const alert = await client.createAlert({
    ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
    destination: { lat: 40.7589, lng: -73.9851 },
    congestionPoint: { lat: 40.7489, lng: -73.9680 },
    message: 'Heavy traffic blockage on route',
    phoneNumber: '+1234567890' // Optional
  });
  console.log('Alert created:', alert);
} catch (error) {
  console.error('Failed to create alert:', error);
}

// Disconnect when done
client.disconnect();

// Clean up subscriptions
unsubscribe();
```

### Police Dashboard

```typescript
import { getPoliceClient } from '@/services/socketClient';

// Get the police client instance
const client = getPoliceClient();

// Connect with JWT token
client.connect(authToken);

// Listen for new alerts
client.onAlertReceived((alert) => {
  console.log('New alert received:', alert);
  // Add to alert list and show notification
});

// Listen for alert updates (from other police officers)
client.onAlertUpdated((alert) => {
  console.log('Alert updated:', alert);
  // Update alert in the list
});

// Listen for ambulance location updates
client.onLocationUpdate((update) => {
  console.log('Ambulance location:', update);
  // Update marker on map
});

// Update alert status
try {
  const updatedAlert = await client.updateAlertStatus('alert-id', 'dispatched');
  console.log('Alert status updated:', updatedAlert);
} catch (error) {
  console.error('Failed to update alert:', error);
}

// Disconnect when done
client.disconnect();
```

## Connection Status UI

Display connection status to users:

```typescript
import { useState, useEffect } from 'react';
import { getAmbulanceClient } from '@/services/socketClient';

function ConnectionIndicator() {
  const [status, setStatus] = useState({
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0
  });

  useEffect(() => {
    const client = getAmbulanceClient();
    
    // Subscribe to status changes
    const unsubscribe = client.onConnectionStatusChange(setStatus);
    
    // Get initial status
    setStatus(client.getConnectionStatus());
    
    return unsubscribe;
  }, []);

  if (status.connected) {
    return <div className="status-connected">Connected</div>;
  }

  if (status.reconnecting) {
    return (
      <div className="status-reconnecting">
        Reconnecting... (Attempt {status.reconnectAttempts}/5)
      </div>
    );
  }

  return <div className="status-disconnected">Disconnected</div>;
}
```

## API Reference

### SocketClient Class

#### Constructor

```typescript
new SocketClient(namespace: 'ambulance' | 'police')
```

#### Methods

##### connect(token: string, serverUrl?: string): void

Connect to the Socket.io server with authentication.

- `token`: JWT authentication token
- `serverUrl`: Optional server URL (defaults to window.location.origin)

##### disconnect(): void

Disconnect from the server and stop automatic reconnection.

##### isConnected(): boolean

Check if the socket is currently connected.

##### getConnectionStatus(): ConnectionStatus

Get the current connection status.

Returns:
```typescript
{
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
}
```

##### onConnectionStatusChange(callback): () => void

Subscribe to connection status changes.

Returns an unsubscribe function.

##### onAlertReceived(callback): () => void

Listen for new alerts (Police only).

Callback receives: `Alert` object

Returns an unsubscribe function.

##### onAlertUpdated(callback): () => void

Listen for alert updates (Ambulance).

Callback receives: `Alert` object

Returns an unsubscribe function.

##### onLocationUpdate(callback): () => void

Listen for ambulance location updates (Police only).

Callback receives: `LocationUpdate` object

Returns an unsubscribe function.

##### emitLocationUpdate(location): void

Send location update to server (Ambulance only).

Parameters:
```typescript
{
  lat: number;
  lng: number;
}
```

##### createAlert(alertData): Promise<Alert>

Create a new alert (Ambulance only).

Parameters:
```typescript
{
  ambulanceLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  congestionPoint: { lat: number; lng: number };
  message: string;
  phoneNumber?: string;
}
```

Returns: Promise that resolves with the created `Alert`

##### updateAlertStatus(alertId, status): Promise<Alert>

Update alert status (Police only).

Parameters:
- `alertId`: string
- `status`: 'pending' | 'dispatched' | 'cleared' | 'cancelled'

Returns: Promise that resolves with the updated `Alert`

### Singleton Functions

#### getAmbulanceClient(): SocketClient

Get or create the ambulance client singleton instance.

#### getPoliceClient(): SocketClient

Get or create the police client singleton instance.

#### resetClients(): void

Reset both client instances (useful for testing).

## Types

### Alert

```typescript
interface Alert {
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
```

### LocationUpdate

```typescript
interface LocationUpdate {
  userId: string;
  ambulanceId: string;
  location: { lat: number; lng: number };
  timestamp: number;
}
```

### ConnectionStatus

```typescript
interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
}
```

## Reconnection Strategy

The client implements automatic reconnection with exponential backoff:

1. **Initial delay**: 1 second
2. **Exponential backoff**: Delay doubles after each attempt (1s, 2s, 4s, 8s, 16s...)
3. **Maximum delay**: Capped at 30 seconds
4. **Maximum attempts**: 5 attempts before giving up
5. **Reset on success**: Reconnection counter resets after successful connection

## Error Handling

All methods handle errors gracefully:

- **Not connected**: Methods that require connection will log a warning and return early
- **Server errors**: Promise-based methods (createAlert, updateAlertStatus) reject with error messages
- **Callback errors**: Errors in user callbacks are caught and logged without breaking the service

## Testing

The service includes comprehensive unit tests covering:

- Connection management
- Reconnection logic with exponential backoff
- Event listeners and emitters
- Connection status tracking
- Error handling
- Singleton pattern

Run tests:
```bash
npm test -- socketClient.test.ts
```

## Requirements

Validates requirements:
- **8.1**: WebSocket connections using Socket.io
- **8.4**: Automatic reconnection with exponential backoff

## Integration with Backend

The client connects to the backend Socket.io server at:
- Ambulance namespace: `/ambulance`
- Police namespace: `/police`

Server events:
- `connect`: Connection established
- `connected`: Server confirmation with user info
- `disconnect`: Connection lost
- `connect_error`: Connection error
- `heartbeat`: Server heartbeat (every 30 seconds)
- `alert:created`: New alert broadcast (Police)
- `alert:updated`: Alert status update (Ambulance)
- `location:updated`: Ambulance location update (Police)

Client events:
- `authenticate`: Re-authenticate with new token
- `location:update`: Send location update (Ambulance)
- `alert:create`: Create new alert (Ambulance)
- `alert:updateStatus`: Update alert status (Police)
