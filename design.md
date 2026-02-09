# Design Document: Smart Ambulance Route Finder

## Overview

The Smart Ambulance Route Finder is a serverless web application that provides traffic-aware emergency routing for ambulances in India. The system uses a React frontend with Leaflet/OpenStreetMap for map visualization, AWS Lambda functions for backend logic, and MapMyIndia APIs for routing and hospital discovery. The architecture is designed to operate entirely within AWS Free Tier limits while providing production-ready functionality.

### Key Design Decisions

1. **Serverless Architecture**: AWS Lambda + API Gateway eliminates infrastructure management and scales automatically
2. **Frontend-First UX**: React with Hooks provides responsive, mobile-first interface critical for emergency scenarios
3. **Security by Design**: All API keys stored in Lambda environment variables, never exposed to frontend
4. **Resilience**: Fallback mechanisms for API failures (demo hospital data, error recovery)
5. **India-Specific**: MapMyIndia APIs provide superior India coverage compared to global providers

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Location     │  │ Map          │  │ Navigation   │     │
│  │ Input        │  │ Visualization│  │ Controller   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                    Fetch API (HTTPS)                        │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Amazon API Gateway (REST API)                  │
│                      CORS Enabled                           │
└────────────────────────────┬───────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Lambda:          │ │ Lambda:      │ │ Lambda:          │
│ GetHospitals     │ │ CalculateRoute│ │ ManageSession   │
│                  │ │              │ │                  │
│ - Query MMI API  │ │ - Query MMI  │ │ - Create/Update │
│ - Fallback data  │ │ - Analyze    │ │ - Store in DB   │
└────────┬─────────┘ └──────┬───────┘ └────────┬─────────┘
         │                  │                   │
         │                  │                   │
         ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    MapMyIndia API                           │
│              (Routing, Geocoding, POI Search)               │
└─────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │  Amazon DynamoDB │
                                        │  (Sessions)      │
                                        └──────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with Hooks (useState, useEffect, useContext, useCallback)
- Leaflet 1.9+ with React-Leaflet for map rendering
- OpenStreetMap tiles (free, no API key required)
- Fetch API for HTTP requests
- CSS3 with Flexbox/Grid for responsive layout

**Backend:**
- Node.js 18.x runtime on AWS Lambda
- Amazon API Gateway (REST API)
- Amazon DynamoDB (On-Demand billing)
- AWS Lambda Environment Variables for secrets
- Amazon CloudWatch for logging

**External Services:**
- MapMyIndia APIs (free tier with provided API key)

## Components and Interfaces

### Frontend Components

#### 1. App Component (Root)
```javascript
// Main application container
const App = () => {
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [emergencyType, setEmergencyType] = useState('');
  const [routes, setRoutes] = useState(null);
  const [navigationMode, setNavigationMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  return (
    <div className="app">
      <Header />
      <LocationInput onLocationSet={setAmbulanceLocation} />
      <EmergencyTypeSelector onSelect={setEmergencyType} />
      <MapView 
        ambulanceLocation={ambulanceLocation}
        selectedHospital={selectedHospital}
        routes={routes}
        navigationMode={navigationMode}
      />
      <NavigationPanel 
        routes={routes}
        navigationMode={navigationMode}
        onStartNavigation={handleStartNavigation}
      />
    </div>
  );
};
```

#### 2. LocationInput Component
```javascript
// Handles GPS detection and manual input
const LocationInput = ({ onLocationSet }) => {
  const detectGPS = async () => {
    // Use navigator.geolocation.getCurrentPosition
    // Validate coordinates are within India
    // Call onLocationSet with {lat, lng}
  };
  
  const handleManualInput = (lat, lng) => {
    // Validate coordinates
    // Call onLocationSet
  };
  
  return (
    <div className="location-input">
      <button onClick={detectGPS}>Detect My Location</button>
      <input type="text" placeholder="Latitude" />
      <input type="text" placeholder="Longitude" />
      <button onClick={handleManualInput}>Set Location</button>
    </div>
  );
};
```

#### 3. MapView Component
```javascript
// Renders map with markers and routes
const MapView = ({ ambulanceLocation, selectedHospital, routes, navigationMode }) => {
  const mapRef = useRef(null);
  const [hospitals, setHospitals] = useState([]);
  
  useEffect(() => {
    if (ambulanceLocation) {
      fetchHospitals(ambulanceLocation);
    }
  }, [ambulanceLocation]);
  
  useEffect(() => {
    if (routes) {
      drawRoutes(routes.bestRoute, routes.trafficRoute);
      fitBounds();
    }
  }, [routes]);
  
  return (
    <MapContainer ref={mapRef} center={[20.5937, 78.9629]} zoom={5}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {ambulanceLocation && <AmbulanceMarker position={ambulanceLocation} />}
      {hospitals.map(h => <HospitalMarker key={h.id} hospital={h} />)}
      {routes && <RoutePolylines routes={routes} />}
    </MapContainer>
  );
};
```

#### 4. NavigationPanel Component
```javascript
// Displays navigation controls and instructions
const NavigationPanel = ({ routes, navigationMode, onStartNavigation }) => {
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [eta, setEta] = useState(0);
  
  return (
    <div className="navigation-panel">
      {navigationMode && (
        <div className="emergency-alert">
          🚨 AMBULANCE ON THE WAY – PLEASE CLEAR THE ROUTE
        </div>
      )}
      {routes && !navigationMode && (
        <button onClick={onStartNavigation}>Start Emergency Route</button>
      )}
      {navigationMode && (
        <div className="nav-info">
          <div>Distance: {remainingDistance} km</div>
          <div>ETA: {eta} minutes</div>
          <div>Instruction: {currentInstruction}</div>
        </div>
      )}
    </div>
  );
};
```

### Backend Lambda Functions

#### 1. GetHospitals Lambda
```javascript
// GET /hospitals?lat={lat}&lng={lng}
exports.handler = async (event) => {
  const { lat, lng } = event.queryStringParameters;
  
  // Validate coordinates
  if (!isValidIndiaCoordinates(lat, lng)) {
    return errorResponse(400, 'Invalid coordinates');
  }
  
  try {
    // Call MapMyIndia Nearby API
    const hospitals = await fetchNearbyHospitals(lat, lng);
    return successResponse(hospitals);
  } catch (error) {
    // Fallback to demo data
    console.error('MapMyIndia API failed:', error);
    const demoHospitals = loadDemoHospitals(lat, lng);
    return successResponse(demoHospitals);
  }
};

const fetchNearbyHospitals = async (lat, lng) => {
  const apiKey = process.env.MAPMYINDIA_API_KEY;
  const url = `https://apis.mapmyindia.com/advancedmaps/v1/${apiKey}/nearby`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keywords: 'hospital',
      refLocation: `${lat},${lng}`,
      radius: 5000 // 5km radius
    })
  });
  
  const data = await response.json();
  return parseHospitalData(data);
};
```

#### 2. CalculateRoute Lambda
```javascript
// POST /route
// Body: { ambulance_lat, ambulance_lng, hospital_lat, hospital_lng, emergency_type }
exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const { ambulance_lat, ambulance_lng, hospital_lat, hospital_lng, emergency_type } = body;
  
  // Validate all coordinates
  if (!isValidIndiaCoordinates(ambulance_lat, ambulance_lng) ||
      !isValidIndiaCoordinates(hospital_lat, hospital_lng)) {
    return errorResponse(400, 'Invalid coordinates');
  }
  
  try {
    // Call MapMyIndia Routing API with alternatives
    const routes = await fetchRoutes(
      ambulance_lat, ambulance_lng,
      hospital_lat, hospital_lng
    );
    
    // Analyze routes for traffic and ETA
    const analysis = analyzeRoutes(routes);
    
    return successResponse({
      bestRoute: analysis.bestRoute,
      trafficRoute: analysis.trafficRoute,
      emergencyType: emergency_type
    });
  } catch (error) {
    console.error('Route calculation failed:', error);
    return errorResponse(500, 'Route calculation failed');
  }
};

const fetchRoutes = async (startLat, startLng, endLat, endLng) => {
  const apiKey = process.env.MAPMYINDIA_API_KEY;
  const url = `https://apis.mapmyindia.com/advancedmaps/v1/${apiKey}/route_adv/driving/${startLng},${startLat};${endLng},${endLat}`;
  
  const response = await fetch(url + '?alternatives=true&steps=true&overview=full');
  const data = await response.json();
  return data.routes;
};

const analyzeRoutes = (routes) => {
  // Sort by duration (considering traffic)
  const sortedByETA = [...routes].sort((a, b) => a.duration - b.duration);
  const bestRoute = sortedByETA[0];
  
  // Find route with highest traffic (if available)
  const sortedByTraffic = [...routes].sort((a, b) => 
    (b.duration - b.duration_typical) - (a.duration - a.duration_typical)
  );
  const trafficRoute = sortedByTraffic[0];
  
  return {
    bestRoute: {
      geometry: bestRoute.geometry,
      distance: bestRoute.distance,
      duration: bestRoute.duration,
      steps: bestRoute.legs[0].steps
    },
    trafficRoute: {
      geometry: trafficRoute.geometry,
      distance: trafficRoute.distance,
      duration: trafficRoute.duration
    }
  };
};
```

#### 3. ManageSession Lambda
```javascript
// POST /session - Create new emergency session
// PUT /session/:id - Update session status
exports.handler = async (event) => {
  const method = event.httpMethod;
  
  if (method === 'POST') {
    return createSession(event);
  } else if (method === 'PUT') {
    return updateSession(event);
  }
  
  return errorResponse(405, 'Method not allowed');
};

const createSession = async (event) => {
  const body = JSON.parse(event.body);
  const sessionId = generateSessionId();
  
  const session = {
    sessionId,
    ambulanceLat: body.ambulance_lat,
    ambulanceLng: body.ambulance_lng,
    hospitalLat: body.hospital_lat,
    hospitalLng: body.hospital_lng,
    emergencyType: body.emergency_type,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  await dynamoDB.put({
    TableName: process.env.SESSIONS_TABLE,
    Item: session
  }).promise();
  
  return successResponse({ sessionId });
};

const updateSession = async (event) => {
  const sessionId = event.pathParameters.id;
  const body = JSON.parse(event.body);
  
  await dynamoDB.update({
    TableName: process.env.SESSIONS_TABLE,
    Key: { sessionId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': body.status,
      ':updatedAt': new Date().toISOString()
    }
  }).promise();
  
  return successResponse({ success: true });
};
```

## Data Models

### Emergency Session
```javascript
{
  sessionId: string,           // UUID
  ambulanceLat: number,         // Decimal degrees
  ambulanceLng: number,         // Decimal degrees
  hospitalLat: number,          // Decimal degrees
  hospitalLng: number,          // Decimal degrees
  emergencyType: string,        // One of: Road Accident, Cardiac Emergency, Trauma, Fire Injury, Pregnancy Emergency
  status: string,               // 'active' | 'completed' | 'cancelled'
  createdAt: string,            // ISO 8601 timestamp
  updatedAt: string,            // ISO 8601 timestamp
  completedAt: string | null    // ISO 8601 timestamp
}
```

### Hospital
```javascript
{
  id: string,                   // Unique identifier
  name: string,                 // Hospital name
  lat: number,                  // Decimal degrees
  lng: number,                  // Decimal degrees
  address: string,              // Full address
  phone: string | null,         // Contact number
  distance: number              // Distance from ambulance in meters
}
```

### Route
```javascript
{
  geometry: string,             // Encoded polyline or GeoJSON
  distance: number,             // Distance in meters
  duration: number,             // Duration in seconds
  steps: Array<{
    instruction: string,        // Turn-by-turn instruction
    distance: number,           // Step distance in meters
    duration: number,           // Step duration in seconds
    location: [number, number]  // [lng, lat]
  }>
}
```

### Location
```javascript
{
  lat: number,                  // Latitude in decimal degrees
  lng: number                   // Longitude in decimal degrees
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: India Coordinate Validation
*For any* latitude/longitude coordinate pair, the system should accept it if and only if it falls within India's geographic boundaries (latitude 8° to 37°N, longitude 68° to 97°E), and reject coordinates outside these bounds with an error message.

**Validates: Requirements 1.4, 1.6**

### Property 2: GPS Failure Fallback
*For any* GPS detection failure or denial, the system should provide both manual latitude/longitude input fields and a place search input field as alternative location entry methods.

**Validates: Requirements 1.2, 1.3**

### Property 3: Location Marker Display
*For any* valid location coordinates within India, when set as the ambulance location, the system should display an ambulance marker (🚑) at exactly those coordinates on the map.

**Validates: Requirements 1.5**

### Property 4: Emergency Type Persistence
*For any* emergency type selection from the dropdown, the system should store that selection in the Emergency_Session and include it in all subsequent route calculation requests.

**Validates: Requirements 2.2, 2.3**

### Property 5: Hospital Marker Rendering
*For any* set of hospital data returned by the backend (whether from MapMyIndia API or fallback data), the system should display a hospital marker (🏥) on the map for each hospital at its specified coordinates.

**Validates: Requirements 3.2**

### Property 6: Hospital Selection and Highlighting
*For any* hospital marker displayed on the map, when selected by the operator, the system should highlight that specific marker and store the hospital as the selected destination.

**Validates: Requirements 3.4, 3.5**

### Property 7: Route API Invocation
*For any* valid ambulance location and hospital location pair, when route calculation is requested, the Route_Engine should make an API call to MapMyIndia requesting multiple route alternatives.

**Validates: Requirements 4.1**

### Property 8: Best Route Selection
*For any* set of route alternatives returned by the routing API, the Route_Engine should identify the route with the shortest ETA (considering traffic) as the Best_Route, ensuring it has lower or equal duration compared to all other alternatives.

**Validates: Requirements 4.3**

### Property 9: Route Response Completeness
*For any* successful route calculation, the system should return both a Best_Route and a Traffic_Route to the frontend, each containing geometry, distance, duration, and turn-by-turn steps.

**Validates: Requirements 4.5**

### Property 10: Route Polyline Visualization
*For any* calculated route pair (Best_Route and Traffic_Route), the system should draw the Best_Route as a blue polyline and the Traffic_Route as a red polyline on the map, with both polylines visible simultaneously.

**Validates: Requirements 5.1, 5.2**

### Property 11: Map Auto-Fit
*For any* combination of ambulance location, hospital location, and calculated routes, the system should automatically adjust the map zoom and center position such that all markers and route polylines are visible within the viewport.

**Validates: Requirements 5.3**

### Property 12: Visual Element Persistence
*For any* route visualization state, the system should maintain simultaneous visibility of the ambulance marker, hospital marker, Best_Route polyline, and Traffic_Route polyline without any element being hidden or obscured.

**Validates: Requirements 5.5**

### Property 13: Navigation Mode Activation
*For any* "Start Emergency Route" button click, the system should transition from route display mode to Navigation_Mode, activating the emergency alert banner and beginning route guidance.

**Validates: Requirements 6.2**

### Property 14: Navigation Information Display
*For any* point in time while in Navigation_Mode, the system should display all three navigation metrics: remaining distance to hospital, estimated time of arrival, and current turn-by-turn instruction.

**Validates: Requirements 6.4, 6.5, 6.6**

### Property 15: Ambulance Position Animation
*For any* navigation session, the ambulance marker position should update along the Best_Route polyline over time, with each position update moving the marker closer to the hospital destination.

**Validates: Requirements 6.3**

### Property 16: Route Recalculation Polling
*For any* active Navigation_Mode session, the system should poll the Backend_Service for route recalculation at regular intervals (e.g., every 60 seconds), and update the displayed route if a faster alternative is found.

**Validates: Requirements 6.7, 6.8**

### Property 17: Emergency Alert Visibility
*For any* point in time while in Navigation_Mode, the system should display the emergency alert banner with the message "🚨 AMBULANCE ON THE WAY – PLEASE CLEAR THE ROUTE" prominently on the screen.

**Validates: Requirements 7.1**

### Property 18: Continuous Distance Monitoring
*For any* active Navigation_Mode session, the system should continuously calculate and monitor the distance between the current ambulance position and the hospital location.

**Validates: Requirements 8.1**

### Property 19: Arrival Detection and Mode Exit
*For any* ambulance position that is within 50 meters of the hospital location during Navigation_Mode, the system should detect arrival, exit Navigation_Mode, display the arrival message, and reset the Emergency_Session state.

**Validates: Requirements 8.3, 8.5**

### Property 20: API Key Security
*For any* frontend application code or configuration file, scanning the content should never reveal MapMyIndia API keys or any other sensitive credentials, with all API keys stored exclusively in backend Lambda environment variables.

**Validates: Requirements 9.1, 9.2**

### Property 21: Backend API Isolation
*For any* external API call to MapMyIndia services, the call should originate exclusively from the Backend_Service Lambda functions, with the frontend never making direct calls to external APIs.

**Validates: Requirements 9.3**

### Property 22: Request Validation
*For any* incoming request to the Backend_Service API endpoints, the system should validate all required parameters (coordinates, emergency type, session ID) before processing, rejecting invalid requests with appropriate error responses.

**Validates: Requirements 9.5**

### Property 23: Error Handling and Logging
*For any* error that occurs during system operation (API failures, validation errors, network issues), the system should display a user-friendly error message to the operator and log the error details to Amazon CloudWatch.

**Validates: Requirements 10.1, 10.5**

### Property 24: Session Creation with Complete Data
*For any* Emergency_Session creation request, the Backend_Service should create a DynamoDB record containing all required fields: sessionId, ambulanceLat, ambulanceLng, hospitalLat, hospitalLng, emergencyType, status, and createdAt timestamp.

**Validates: Requirements 12.1, 12.2**

### Property 25: Session Status Updates
*For any* Navigation_Mode activation or arrival detection event, the system should update the corresponding Emergency_Session record in DynamoDB with the new status ('active' or 'completed') and an updatedAt timestamp.

**Validates: Requirements 12.3, 12.4**

### Property 26: Fetch API Exclusivity
*For any* HTTP request made by the Frontend_Application to the backend, the request should be made using the Fetch API, with no other HTTP client libraries (axios, XMLHttpRequest, etc.) present in the frontend codebase.

**Validates: Requirements 13.3**

### Property 27: JSON Response Format
*For any* API response from the Backend_Service, the response should be valid JSON with an appropriate HTTP status code (200 for success, 400 for client errors, 500 for server errors).

**Validates: Requirements 15.5**

## Error Handling

### Frontend Error Handling

1. **GPS Detection Failures**
   - Catch `navigator.geolocation` errors
   - Display user-friendly message: "Unable to detect location. Please enter manually."
   - Automatically show manual input fields

2. **API Request Failures**
   - Wrap all fetch calls in try-catch blocks
   - Display error toast notifications
   - Provide retry buttons for failed operations
   - Maintain application state during errors

3. **Invalid Input Handling**
   - Validate coordinates before submission
   - Show inline validation errors
   - Prevent form submission with invalid data

4. **Network Connectivity**
   - Detect offline state using `navigator.onLine`
   - Display persistent warning banner when offline
   - Queue requests for retry when connection restored

### Backend Error Handling

1. **MapMyIndia API Failures**
   - Implement exponential backoff for retries
   - Fall back to demo hospital data if API unavailable
   - Log all API failures to CloudWatch
   - Return graceful error responses to frontend

2. **DynamoDB Errors**
   - Catch and log all database operation errors
   - Return appropriate HTTP status codes
   - Implement retry logic for transient failures

3. **Input Validation**
   - Validate all coordinates are within India bounds
   - Validate emergency type is from allowed list
   - Validate session IDs exist before updates
   - Return 400 Bad Request for invalid inputs

4. **Lambda Timeout Handling**
   - Set appropriate timeout values (30 seconds max)
   - Implement early termination for long-running operations
   - Return partial results when possible

### Error Response Format

All backend errors should follow this structure:
```javascript
{
  error: true,
  message: "User-friendly error message",
  code: "ERROR_CODE",
  details: {} // Optional additional context
}
```

## Testing Strategy

### Dual Testing Approach

The system will employ both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for production readiness

### Property-Based Testing

**Library Selection**: Use **fast-check** for JavaScript/TypeScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with format: **Feature: smart-ambulance-route-finder, Property {number}: {property_text}**
- Each correctness property implemented by a SINGLE property-based test

**Key Property Tests**:

1. **Coordinate Validation Properties**
   - Generate random coordinates worldwide
   - Verify only India coordinates accepted
   - Verify rejection messages for out-of-bounds coordinates

2. **Route Selection Properties**
   - Generate random route sets with varying ETAs
   - Verify best route always has minimum ETA
   - Verify route response structure completeness

3. **Session Management Properties**
   - Generate random session data
   - Verify all required fields present in DynamoDB
   - Verify status transitions follow valid state machine

4. **Navigation State Properties**
   - Generate random navigation scenarios
   - Verify all navigation info displayed during Navigation_Mode
   - Verify arrival detection at various distances

### Unit Testing

**Framework**: Jest for both frontend and backend

**Frontend Unit Tests**:
- Component rendering with various props
- User interaction handlers (button clicks, input changes)
- GPS detection success and failure scenarios
- Map marker rendering and updates
- Navigation mode transitions
- Error message display

**Backend Unit Tests**:
- API endpoint request/response handling
- MapMyIndia API integration (with mocks)
- DynamoDB operations (with mocks)
- Input validation edge cases
- Error handling scenarios
- Fallback data loading

**Integration Tests**:
- End-to-end flow: location → hospital discovery → route calculation → navigation
- API Gateway → Lambda → DynamoDB integration
- Frontend → Backend API communication
- Error recovery flows

### Test Coverage Goals

- Minimum 80% code coverage for both frontend and backend
- 100% coverage of error handling paths
- All 27 correctness properties implemented as property tests
- All edge cases covered by unit tests

### Testing Tools

- **Jest**: Unit testing framework
- **fast-check**: Property-based testing library
- **React Testing Library**: Frontend component testing
- **AWS SAM Local**: Local Lambda testing
- **Supertest**: API endpoint testing
- **DynamoDB Local**: Local database testing

## Deployment Architecture

### AWS Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                    Amazon CloudFront (Optional)             │
│                         CDN for Frontend                    │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Amazon S3 Bucket                       │
│                   Static Frontend Hosting                   │
│              (index.html, bundle.js, assets)                │
└─────────────────────────────────────────────────────────────┘

                             │
                             │ HTTPS Requests
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Amazon API Gateway                         │
│                                                             │
│  GET  /hospitals?lat={lat}&lng={lng}                       │
│  POST /route                                                │
│  POST /session                                              │
│  PUT  /session/:id                                          │
└────────────────────────────┬───────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Lambda:          │ │ Lambda:      │ │ Lambda:          │
│ GetHospitals     │ │ CalculateRoute│ │ ManageSession   │
│                  │ │              │ │                  │
│ Runtime: Node 18 │ │ Runtime:     │ │ Runtime: Node 18│
│ Memory: 256MB    │ │ Node 18      │ │ Memory: 256MB   │
│ Timeout: 30s     │ │ Memory: 512MB│ │ Timeout: 10s    │
└────────┬─────────┘ │ Timeout: 30s │ └────────┬─────────┘
         │           └──────┬───────┘          │
         │                  │                  │
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Environment Variables                    │
│                                                             │
│  MAPMYINDIA_API_KEY=38b95f70-a442-422f-adf0-0bb5d92a6e90  │
│  SESSIONS_TABLE=ambulance-sessions                         │
│  DEMO_HOSPITALS_BUCKET=ambulance-demo-data                 │
└─────────────────────────────────────────────────────────────┘

         │                                     │
         │                                     │
         ▼                                     ▼
┌──────────────────────┐            ┌──────────────────────┐
│  MapMyIndia API      │            │  Amazon DynamoDB     │
│                      │            │                      │
│  - Nearby Search     │            │  Table: ambulance-   │
│  - Routing API       │            │         sessions     │
│  - Geocoding         │            │                      │
└──────────────────────┘            │  Partition Key:      │
                                    │    sessionId (String)│
                                    │                      │
                                    │  Billing: On-Demand  │
                                    └──────────────────────┘
```

### DynamoDB Table Schema

**Table Name**: `ambulance-sessions`

**Partition Key**: `sessionId` (String)

**Attributes**:
- `sessionId`: String (UUID)
- `ambulanceLat`: Number
- `ambulanceLng`: Number
- `hospitalLat`: Number
- `hospitalLng`: Number
- `emergencyType`: String
- `status`: String
- `createdAt`: String (ISO 8601)
- `updatedAt`: String (ISO 8601)
- `completedAt`: String (ISO 8601, nullable)

**Indexes**: None required for MVP

**Billing Mode**: On-Demand (pay per request)

### Lambda Configuration

**GetHospitals Function**:
- Runtime: Node.js 18.x
- Memory: 256 MB
- Timeout: 30 seconds
- Environment Variables: MAPMYINDIA_API_KEY, DEMO_HOSPITALS_BUCKET

**CalculateRoute Function**:
- Runtime: Node.js 18.x
- Memory: 512 MB (higher for route processing)
- Timeout: 30 seconds
- Environment Variables: MAPMYINDIA_API_KEY

**ManageSession Function**:
- Runtime: Node.js 18.x
- Memory: 256 MB
- Timeout: 10 seconds
- Environment Variables: SESSIONS_TABLE

### API Gateway Configuration

**API Type**: REST API

**CORS Configuration**:
```javascript
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key"
}
```

**Endpoints**:
- `GET /hospitals` → GetHospitals Lambda
- `POST /route` → CalculateRoute Lambda
- `POST /session` → ManageSession Lambda
- `PUT /session/{id}` → ManageSession Lambda

### Frontend Deployment

**Hosting**: Amazon S3 Static Website Hosting

**Build Process**:
1. Run `npm run build` to create production bundle
2. Upload build artifacts to S3 bucket
3. Configure bucket for static website hosting
4. Set bucket policy for public read access

**Optional CDN**: Amazon CloudFront for global distribution

## Security Considerations

### API Key Management
- Never commit API keys to version control
- Store keys in AWS Lambda environment variables
- Rotate keys periodically
- Use AWS Secrets Manager for production (if budget allows)

### CORS Policy
- Configure restrictive CORS in production
- Whitelist only frontend domain
- Validate Origin header in Lambda functions

### Input Validation
- Validate all coordinates server-side
- Sanitize all user inputs
- Implement rate limiting on API Gateway
- Use AWS WAF for DDoS protection (if budget allows)

### Data Privacy
- No personally identifiable information stored
- Session data retention policy (auto-delete after 30 days)
- Comply with Indian data protection regulations

## Performance Optimization

### Frontend Optimization
- Code splitting for faster initial load
- Lazy load map components
- Debounce location input changes
- Cache hospital data in localStorage
- Minimize re-renders with React.memo

### Backend Optimization
- Lambda warm-up strategies (periodic pings)
- Connection pooling for external APIs
- Efficient DynamoDB queries (use partition key)
- Compress API responses
- Implement caching for hospital data

### Map Optimization
- Use vector tiles for faster rendering
- Limit marker count (show only nearest 10 hospitals)
- Simplify polyline geometry for large routes
- Implement viewport-based rendering

## Scalability Considerations

### Current Architecture Limits (Free Tier)
- Lambda: 1M requests/month, 400,000 GB-seconds compute
- API Gateway: 1M requests/month
- DynamoDB: 25 GB storage, 25 read/write capacity units
- S3: 5 GB storage, 20,000 GET requests

### Scaling Strategy
- Lambda auto-scales to handle concurrent requests
- DynamoDB on-demand billing scales automatically
- Monitor CloudWatch metrics for usage patterns
- Implement request throttling if approaching limits

### Future Enhancements
- Add Redis caching layer for hospital data
- Implement WebSocket for real-time updates
- Add load balancing for high traffic
- Migrate to reserved capacity for cost optimization

## Monitoring and Logging

### CloudWatch Metrics
- Lambda invocation count and duration
- API Gateway request count and latency
- DynamoDB read/write capacity usage
- Error rates and types

### CloudWatch Logs
- All Lambda function logs
- API Gateway access logs
- Error stack traces
- MapMyIndia API response times

### Alerts
- Lambda error rate > 5%
- API Gateway 5xx errors
- DynamoDB throttling events
- Approaching free tier limits

## Demo Hospital Dataset

For fallback when MapMyIndia API is unavailable, include a demo dataset with major hospitals in Indian metro cities:

```javascript
const demoHospitals = [
  // Delhi
  { id: "h1", name: "AIIMS Delhi", lat: 28.5672, lng: 77.2100, address: "Ansari Nagar, New Delhi" },
  { id: "h2", name: "Safdarjung Hospital", lat: 28.5677, lng: 77.2063, address: "Safdarjung, New Delhi" },
  
  // Mumbai
  { id: "h3", name: "KEM Hospital", lat: 18.9935, lng: 72.8449, address: "Parel, Mumbai" },
  { id: "h4", name: "Lilavati Hospital", lat: 19.0544, lng: 72.8320, address: "Bandra, Mumbai" },
  
  // Bangalore
  { id: "h5", name: "Victoria Hospital", lat: 12.9716, lng: 77.5946, address: "Fort, Bangalore" },
  { id: "h6", name: "St. John's Hospital", lat: 12.9539, lng: 77.6050, address: "Koramangala, Bangalore" },
  
  // Chennai
  { id: "h7", name: "Apollo Hospital", lat: 13.0569, lng: 80.2497, address: "Greams Road, Chennai" },
  { id: "h8", name: "Stanley Medical College", lat: 13.0827, lng: 80.2707, address: "Old Jail Road, Chennai" },
  
  // Kolkata
  { id: "h9", name: "SSKM Hospital", lat: 22.5448, lng: 88.3426, address: "Bhowanipore, Kolkata" },
  { id: "h10", name: "Apollo Gleneagles", lat: 22.5355, lng: 88.3534, address: "Canal Circular Road, Kolkata" }
];
```

This dataset should be stored in an S3 bucket or embedded in the Lambda function code.
