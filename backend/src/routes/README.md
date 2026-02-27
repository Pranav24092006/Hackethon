# Authentication API Endpoints

This document describes the authentication endpoints implemented for the Smart Emergency Route Optimizer.

## Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "username": "string (3-50 characters)",
  "password": "string (min 8 characters)",
  "role": "ambulance" | "police"
}
```

**Success Response (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "ambulance" | "police",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing or invalid fields
- `409 Conflict` - Username already exists
- `500 Internal Server Error` - Registration failed

---

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response (200 OK):**
```json
{
  "token": "JWT token string",
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "ambulance" | "police",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Login failed

---

### GET /api/auth/verify

Verify JWT token validity.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "ambulance" | "police",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing, invalid, or expired token
- `500 Internal Server Error` - Verification failed

## Error Handling

All endpoints follow consistent error handling:

1. **Invalid Credentials (401)**: Returns "Invalid username or password" without revealing which field was incorrect
2. **Expired Token (401)**: Returns "Session expired, please log in again"
3. **Duplicate Username (409)**: Returns "Username already exists"
4. **Missing Fields (400)**: Returns specific message about which fields are missing
5. **Invalid Format (400)**: Returns validation error details

## Security Features

- Passwords are hashed using bcrypt with 10 salt rounds
- JWT tokens expire after 24 hours
- Authorization header must use "Bearer" scheme
- Username uniqueness is enforced at registration
- Error messages don't reveal sensitive information

## Testing

Run the test suite:
```bash
npm test -- auth.test.ts
```

## Requirements Validated

This implementation validates the following requirements:
- **1.1**: Valid credentials grant access
- **1.2**: Invalid credentials are rejected
- **1.3**: New user registration with role assignment
- **1.5**: Session expiration requires re-authentication
