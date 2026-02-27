# API Documentation - Smart Emergency Route Optimizer

Complete API reference for the Smart Emergency Route Optimizer backend services.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

All API endpoints (except `/api/auth/register` and `/api/auth/login`) require JWT authentication.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "string (3-50 characters)",
  "password": "string (min 8 characters)",
  "role": "ambulance" | "police"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "role": "ambulance" | "police",
    "createdAt": "ISO 8601 timestamp"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `409 Conflict` - Username already exists
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ambulance1",
    "password": "securepass123",
    "role": "ambulance"
  }'
```

---

### Login

Authenticate and receive JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "token": "string (JWT token)",
  "user": {
    "id": "string",
    "username": "string",
    "role": "ambulance" | "police"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing credentials
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ambulance1",
    "password": "securepass123"
  }'
```

---

### Verify Token

Verify JWT token validity.

**Endpoint:** `GET /api/auth/verify`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "role": "ambulance" | "police"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or expired token
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Route Endpoints

### Calculate Route

Calculate optimal route with traffic-aware pathfinding.

**Endpoint:** `POST /api/routes/calculate`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "start": {
    "lat": number,
    "lng": number
  },
  "destination": {
    "lat": number,
    "lng": number
  }
}
```

**Response:** `200 OK`
```json
{
  "route": {
    "path": [
      { "lat": number, "lng": number }
    ],
    "segments": [
      {
        "start": { "lat": number, "lng": number },
        "end": { "lat": number, "lng": number },
        "distance": number,
        "congestionLevel": "green" | "orange" | "red"
      }
    ],
    "totalDistance": number,
    "estimatedTime": number
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid coordinates
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - No route available
- `503 Service Unavailable` - Road network data unavailable
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/routes/calculate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start": { "lat": 40.7128, "lng": -74.0060 },
    "destination": { "lat": 40.7580, "lng": -73.9855 }
  }'
```

---

## Alert Endpoints

### Create Alert

Create emergency alert for traffic blockage.

**Endpoint:** `POST /api/alerts`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ambulanceLocation": {
    "lat": number,
    "lng": number
  },
  "destination": {
    "lat": number,
    "lng": number
  },
  "congestionPoint": {
    "lat": number,
    "lng": number
  },
  "message": "string"
}
```

**Response:** `201 Created`
```json
{
  "alert": {
    "id": "string",
    "ambulanceId": "string",
    "ambulanceLocation": { "lat": number, "lng": number },
    "destination": { "lat": number, "lng": number },
    "congestionPoint": { "lat": number, "lng": number },
    "message": "string",
    "status": "pending",
    "createdAt": "ISO 8601 timestamp"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ambulanceLocation": { "lat": 40.7128, "lng": -74.0060 },
    "destination": { "lat": 40.7580, "lng": -73.9855 },
    "congestionPoint": { "lat": 40.7300, "lng": -74.0000 },
    "message": "Traffic blockage detected, need assistance"
  }'
```

---

### Update Alert Status

Update alert status (police action).

**Endpoint:** `PUT /api/alerts/:id/status`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "dispatched" | "cleared"
}
```

**Response:** `200 OK`
```json
{
  "alert": {
    "id": "string",
    "status": "dispatched" | "cleared",
    "updatedAt": "ISO 8601 timestamp"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid status
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Alert not found
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X PUT http://localhost:3000/api/alerts/alert-123/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "dispatched" }'
```

---

### Get Alerts

Get alerts (filtered by status or ambulance).

**Endpoint:** `GET /api/alerts`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, dispatched, cleared)
- `ambulanceId` (optional): Filter by ambulance ID

**Response:** `200 OK`
```json
{
  "alerts": [
    {
      "id": "string",
      "ambulanceId": "string",
      "ambulanceLocation": { "lat": number, "lng": number },
      "destination": { "lat": number, "lng": number },
      "congestionPoint": { "lat": number, "lng": number },
      "message": "string",
      "status": "pending" | "dispatched" | "cleared",
      "createdAt": "ISO 8601 timestamp",
      "updatedAt": "ISO 8601 timestamp"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X GET "http://localhost:3000/api/alerts?status=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Hospital Endpoints

### Get Hospitals

Get hospitals sorted by distance from location.

**Endpoint:** `GET /api/hospitals`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `lat` (required): Latitude of current location
- `lng` (required): Longitude of current location

**Response:** `200 OK`
```json
{
  "hospitals": [
    {
      "id": "string",
      "name": "string",
      "location": { "lat": number, "lng": number },
      "address": "string",
      "capacity": number,
      "emergencyCapable": boolean,
      "phoneNumber": "string",
      "distance": number
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Missing coordinates
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X GET "http://localhost:3000/api/hospitals?lat=40.7128&lng=-74.0060" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## WebSocket Events (Socket.io)

### Connection

Connect to WebSocket server with JWT authentication.

**Namespace:** `/ambulance` or `/police`

**Connection:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/ambulance', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

---

### Ambulance Events

#### Emit: location:update

Send location update to server.

**Event:** `location:update`

**Payload:**
```json
{
  "lat": number,
  "lng": number
}
```

**Example:**
```javascript
socket.emit('location:update', {
  lat: 40.7128,
  lng: -74.0060
});
```

---

#### Emit: alert:create

Create emergency alert via WebSocket.

**Event:** `alert:create`

**Payload:**
```json
{
  "ambulanceLocation": { "lat": number, "lng": number },
  "destination": { "lat": number, "lng": number },
  "congestionPoint": { "lat": number, "lng": number },
  "message": "string"
}
```

**Example:**
```javascript
socket.emit('alert:create', {
  ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
  destination: { lat: 40.7580, lng: -73.9855 },
  congestionPoint: { lat: 40.7300, lng: -74.0000 },
  message: 'Traffic blockage detected'
});
```

---

#### Listen: alert:updated

Receive alert status updates.

**Event:** `alert:updated`

**Payload:**
```json
{
  "id": "string",
  "status": "dispatched" | "cleared",
  "updatedAt": "ISO 8601 timestamp"
}
```

**Example:**
```javascript
socket.on('alert:updated', (alert) => {
  console.log('Alert updated:', alert);
});
```

---

### Police Events

#### Listen: alert:new

Receive new emergency alerts.

**Event:** `alert:new`

**Payload:**
```json
{
  "id": "string",
  "ambulanceId": "string",
  "ambulanceLocation": { "lat": number, "lng": number },
  "destination": { "lat": number, "lng": number },
  "congestionPoint": { "lat": number, "lng": number },
  "message": "string",
  "status": "pending",
  "createdAt": "ISO 8601 timestamp"
}
```

**Example:**
```javascript
socket.on('alert:new', (alert) => {
  console.log('New alert:', alert);
});
```

---

#### Emit: alert:updateStatus

Update alert status (dispatch team or mark cleared).

**Event:** `alert:updateStatus`

**Payload:**
```json
{
  "alertId": "string",
  "status": "dispatched" | "cleared"
}
```

**Example:**
```javascript
socket.emit('alert:updateStatus', {
  alertId: 'alert-123',
  status: 'dispatched'
});
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": {
    "message": "string",
    "statusCode": number,
    "details": "string (development only)"
  }
}
```

### Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Route calculation**: 10 requests per minute
- **Alert creation**: 5 requests per minute
- **Other endpoints**: 60 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640000000
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 20, max: 100): Items per page

**Response Headers:**
```
X-Total-Count: 150
X-Page: 1
X-Per-Page: 20
```

---

## Testing

### Postman Collection

Import the Postman collection for easy API testing:

```bash
# Download collection
curl -o postman_collection.json \
  https://your-domain.com/api/postman_collection.json
```

### Example Test Flow

1. Register user
2. Login and save token
3. Calculate route
4. Create alert
5. Update alert status (as police)

---

## Support

For API issues:
- Check error messages in response
- Review this documentation
- Check CloudWatch logs
- Contact support team

---

**Last Updated**: Current session
**API Version**: 1.0.0
**Base URL**: http://localhost:3000
