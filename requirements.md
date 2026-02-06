# Requirements Document

## Introduction

The Smart Ambulance Route Finder is a production-grade web application designed to help ambulances in India navigate to the nearest hospital using the fastest, least-congested route. The system leverages real-time traffic data, GPS location services, and mapping APIs to provide emergency responders with optimal routing decisions during critical situations.

## Glossary

- **Ambulance_System**: The complete Smart Ambulance Route Finder web application
- **Route_Calculator**: Backend service that computes optimal routes using traffic data
- **Map_Visualizer**: Frontend component that displays maps, markers, and route polylines
- **Navigation_Engine**: Component that provides turn-by-turn guidance and tracks ambulance movement
- **Hospital_Locator**: Service that discovers nearby hospitals based on ambulance location
- **Location_Service**: Component that handles GPS detection and location validation
- **Emergency_Type**: Classification of medical emergency (Road Accident, Cardiac Emergency, Trauma, Fire Injury, Pregnancy Emergency)
- **Best_Route**: The route with the shortest estimated time of arrival and lowest traffic congestion
- **Traffic_Route**: Alternative route highlighting high-congestion areas
- **MapMyIndia_API**: Primary mapping and routing service provider for India

## Requirements

### Requirement 1: Ambulance Location Detection

**User Story:** As an ambulance driver, I want the system to automatically detect my current location, so that I can quickly start navigation without manual input.

#### Acceptance Criteria

1. WHEN the application loads, THE Location_Service SHALL request browser GPS permissions
2. WHEN GPS permission is granted, THE Location_Service SHALL retrieve the current latitude and longitude coordinates
3. WHEN GPS coordinates are obtained, THE Location_Service SHALL validate that the coordinates lie within India's geographic boundaries (latitude: 8° to 37°N, longitude: 68° to 97°E)
4. IF the location is outside India, THEN THE Location_Service SHALL display an error message and prevent further operations
5. WHEN a valid location is detected, THE Map_Visualizer SHALL display an ambulance marker (🚑) at the detected coordinates
6. WHERE GPS is unavailable or denied, THE Ambulance_System SHALL provide manual location input options

### Requirement 2: Manual Location Input

**User Story:** As an ambulance driver, I want to manually enter my location when GPS is unavailable, so that I can still use the navigation system.

#### Acceptance Criteria

1. THE Ambulance_System SHALL provide input fields for latitude and longitude coordinates
2. THE Ambulance_System SHALL provide a place search input field for location lookup
3. WHEN a user enters coordinates, THE Location_Service SHALL validate that they are numeric and within valid ranges
4. WHEN a user searches for a place name, THE Location_Service SHALL query MapMyIndia_API to resolve the place to coordinates
5. WHEN manual coordinates are entered, THE Location_Service SHALL validate that the location lies within India
6. WHEN valid manual location is provided, THE Map_Visualizer SHALL display an ambulance marker at the specified location

### Requirement 3: Emergency Type Selection

**User Story:** As an ambulance dispatcher, I want to specify the type of medical emergency, so that the system can prioritize routing and prepare hospitals accordingly.

#### Acceptance Criteria

1. THE Ambulance_System SHALL display a dropdown menu with emergency type options
2. THE Ambulance_System SHALL include these emergency types: Road Accident, Cardiac Emergency, Trauma, Fire Injury, Pregnancy Emergency
3. WHEN a user selects an emergency type, THE Ambulance_System SHALL store the selection
4. WHEN route calculation is requested, THE Ambulance_System SHALL send the emergency type to the backend API
5. THE Ambulance_System SHALL require emergency type selection before allowing route calculation

### Requirement 4: Hospital Discovery

**User Story:** As an ambulance driver, I want to see nearby hospitals on the map, so that I can choose the most appropriate destination for the patient.

#### Acceptance Criteria

1. WHEN ambulance location is determined, THE Hospital_Locator SHALL send a GET request to /hospitals endpoint with latitude and longitude parameters
2. THE Hospital_Locator SHALL query MapMyIndia_API to retrieve hospitals within a 10km radius of the ambulance location
3. WHERE MapMyIndia_API returns no results or fails, THE Hospital_Locator SHALL return a fallback dataset of demo hospitals for the nearest metro city
4. WHEN hospital data is received, THE Map_Visualizer SHALL display hospital markers (🏥) on the map
5. THE Map_Visualizer SHALL display hospital names, addresses, and distances from ambulance location
6. WHEN a user clicks a hospital marker, THE Ambulance_System SHALL select that hospital as the destination
7. THE Ambulance_System SHALL allow only one hospital to be selected at a time

### Requirement 5: Traffic-Aware Route Calculation

**User Story:** As an ambulance driver, I want the system to calculate the fastest route considering current traffic conditions, so that I can reach the hospital as quickly as possible.

#### Acceptance Criteria

1. WHEN a hospital is selected, THE Route_Calculator SHALL send a POST request to /route endpoint with ambulance and hospital coordinates
2. THE Route_Calculator SHALL query MapMyIndia_API Directions API to retrieve multiple route alternatives
3. THE Route_Calculator SHALL analyze each route for distance (km), estimated time of arrival (minutes), and traffic congestion level
4. THE Route_Calculator SHALL identify the Best_Route as the route with the shortest ETA and lowest traffic congestion
5. THE Route_Calculator SHALL identify the Traffic_Route as an alternative route with high congestion for comparison
6. THE Route_Calculator SHALL return route data including polyline coordinates, distance_km, duration_min, and traffic_level for both routes
7. WHEN route calculation fails, THE Route_Calculator SHALL return an error message with details

### Requirement 6: Route Visualization

**User Story:** As an ambulance driver, I want to see the recommended route and traffic conditions on the map, so that I can understand the path before starting navigation.

#### Acceptance Criteria

1. WHEN route data is received, THE Map_Visualizer SHALL decode the polyline coordinates for both Best_Route and Traffic_Route
2. THE Map_Visualizer SHALL draw the Best_Route as a blue polyline on the map
3. THE Map_Visualizer SHALL draw the Traffic_Route as a red polyline on the map
4. THE Map_Visualizer SHALL display route information including distance and estimated duration for both routes
5. THE Map_Visualizer SHALL automatically adjust the map viewport to fit both the ambulance marker, hospital marker, and both route polylines
6. THE Map_Visualizer SHALL display a traffic legend indicating blue for optimal route and red for congested route
7. THE Map_Visualizer SHALL allow users to toggle route visibility

### Requirement 7: Navigation Mode Activation

**User Story:** As an ambulance driver, I want to start turn-by-turn navigation along the optimal route, so that I can focus on driving while receiving guidance.

#### Acceptance Criteria

1. THE Ambulance_System SHALL display a "Start Emergency Route" button when a route is calculated
2. WHEN the button is clicked, THE Navigation_Engine SHALL enter navigation mode
3. WHEN navigation mode starts, THE Navigation_Engine SHALL display remaining distance to hospital
4. WHEN navigation mode starts, THE Navigation_Engine SHALL display remaining estimated time of arrival
5. WHEN navigation mode starts, THE Navigation_Engine SHALL display turn-by-turn text directions
6. THE Navigation_Engine SHALL animate the ambulance marker moving along the Best_Route polyline
7. THE Navigation_Engine SHALL update the ambulance position at regular intervals (every 2-5 seconds)

### Requirement 8: Dynamic Route Recalculation

**User Story:** As an ambulance driver, I want the system to automatically recalculate my route if traffic conditions change, so that I always follow the fastest path.

#### Acceptance Criteria

1. WHILE navigation mode is active, THE Navigation_Engine SHALL poll the backend /route endpoint every 60 seconds
2. WHEN polling for route updates, THE Navigation_Engine SHALL send the current ambulance position and destination hospital coordinates
3. WHEN a new route is received with significantly different ETA (>2 minutes difference), THE Navigation_Engine SHALL update the displayed route
4. WHEN the route is updated, THE Navigation_Engine SHALL display a notification indicating route change
5. WHEN the route is updated, THE Map_Visualizer SHALL redraw the route polyline with the new path
6. THE Navigation_Engine SHALL continue animating ambulance movement along the updated route

### Requirement 9: Emergency Alert Display

**User Story:** As an ambulance driver, I want the system to display a prominent emergency alert, so that future integrations can notify traffic signals and other vehicles.

#### Acceptance Criteria

1. WHEN navigation mode is active, THE Ambulance_System SHALL display a prominent alert banner
2. THE Ambulance_System SHALL display the message: "🚨 AMBULANCE ON THE WAY – PLEASE CLEAR THE ROUTE"
3. THE alert banner SHALL be visually distinct with high-contrast colors (red/orange background)
4. THE alert banner SHALL remain visible throughout the entire navigation session
5. THE alert banner SHALL be positioned at the top of the screen and remain fixed during scrolling

### Requirement 10: Arrival Detection and Navigation Completion

**User Story:** As an ambulance driver, I want the system to automatically detect when I reach the hospital, so that navigation stops and I can focus on patient handoff.

#### Acceptance Criteria

1. WHILE navigation mode is active, THE Navigation_Engine SHALL continuously calculate the distance between current ambulance position and hospital destination
2. WHEN the distance to hospital is less than 50 meters, THE Navigation_Engine SHALL detect arrival
3. WHEN arrival is detected, THE Navigation_Engine SHALL stop navigation mode
4. WHEN arrival is detected, THE Navigation_Engine SHALL stop ambulance marker animation
5. WHEN arrival is detected, THE Ambulance_System SHALL display the message: "✅ Destination Reached – Patient Delivered"
6. WHEN arrival is detected, THE Ambulance_System SHALL provide an option to reset the system for the next emergency
7. WHEN the system is reset, THE Ambulance_System SHALL clear all route data, hospital selection, and return to the initial state

### Requirement 11: Backend API Architecture

**User Story:** As a system architect, I want all external API calls to be handled by the backend, so that API keys remain secure and the system is scalable.

#### Acceptance Criteria

1. THE Ambulance_System SHALL implement a Node.js + Express backend server
2. THE backend SHALL handle all MapMyIndia_API requests and never expose API keys to the frontend
3. THE backend SHALL implement a GET /hospitals endpoint that accepts lat and lng query parameters
4. THE backend SHALL implement a POST /route endpoint that accepts ambulance and hospital coordinates in the request body
5. THE backend SHALL enable CORS to allow frontend requests from the deployment domain
6. THE backend SHALL use environment variables (dotenv) to store API keys and configuration
7. THE backend SHALL return JSON responses with appropriate HTTP status codes
8. WHEN external API calls fail, THE backend SHALL return error responses with descriptive messages

### Requirement 12: Frontend Architecture

**User Story:** As a developer, I want the frontend to be built with modern React patterns, so that the application is maintainable and performant.

#### Acceptance Criteria

1. THE Ambulance_System SHALL implement the frontend using React with functional components and hooks
2. THE frontend SHALL use Leaflet + OpenStreetMap OR Mapbox GL JS for map rendering
3. THE frontend SHALL use the Fetch API for all HTTP requests to the backend
4. THE frontend SHALL implement error handling for all API requests
5. THE frontend SHALL display loading indicators during asynchronous operations
6. THE frontend SHALL be responsive and optimized for mobile and tablet devices (ambulance dashboard use case)
7. THE frontend SHALL use semantic HTML5 and modern CSS3 for styling

### Requirement 13: Location Validation

**User Story:** As a system administrator, I want the system to validate that all locations are within India, so that the application only operates in its intended geographic region.

#### Acceptance Criteria

1. WHEN any location coordinates are received, THE Location_Service SHALL validate latitude is between 8° and 37° North
2. WHEN any location coordinates are received, THE Location_Service SHALL validate longitude is between 68° and 97° East
3. IF coordinates are outside these bounds, THEN THE Location_Service SHALL reject the location
4. IF coordinates are outside these bounds, THEN THE Ambulance_System SHALL display an error message: "Location must be within India"
5. THE Location_Service SHALL prevent route calculation when location validation fails

### Requirement 14: Deployment Readiness

**User Story:** As a DevOps engineer, I want the application to be deployment-ready for cloud platforms, so that it can be quickly deployed to production.

#### Acceptance Criteria

1. THE Ambulance_System SHALL include configuration for deployment to Render, Railway, or AWS
2. THE backend SHALL listen on a configurable PORT environment variable
3. THE Ambulance_System SHALL include a package.json with all dependencies and start scripts
4. THE Ambulance_System SHALL include environment variable templates (.env.example)
5. THE Ambulance_System SHALL include a README with deployment instructions
6. THE backend SHALL serve the frontend static files in production mode
7. THE Ambulance_System SHALL be configured for HTTPS in production environments

### Requirement 15: Scalability Architecture

**User Story:** As a system architect, I want the system architecture to support all-India scaling, so that the application can handle users across the entire country.

#### Acceptance Criteria

1. THE Hospital_Locator SHALL be designed to query hospitals across all Indian states and territories
2. THE Route_Calculator SHALL support route calculation between any two points within India
3. THE backend SHALL implement rate limiting to prevent API quota exhaustion
4. THE backend SHALL implement caching for frequently requested hospital data
5. THE Ambulance_System SHALL be stateless to support horizontal scaling
6. THE backend SHALL log all requests for monitoring and debugging
7. WHERE MapMyIndia_API has regional limitations, THE Ambulance_System SHALL gracefully degrade to demo mode for supported metro cities

### Requirement 16: Error Handling and Resilience

**User Story:** As an ambulance driver, I want the system to handle errors gracefully, so that I can still navigate even when some services fail.

#### Acceptance Criteria

1. WHEN GPS detection fails, THE Ambulance_System SHALL display a clear error message and offer manual input
2. WHEN MapMyIndia_API is unavailable, THE Hospital_Locator SHALL fall back to demo hospital data
3. WHEN route calculation fails, THE Ambulance_System SHALL display an error message and allow retry
4. WHEN network connectivity is lost during navigation, THE Navigation_Engine SHALL continue using the last known route
5. WHEN any API request times out (>10 seconds), THE Ambulance_System SHALL display a timeout error
6. THE Ambulance_System SHALL log all errors to the browser console for debugging
7. THE backend SHALL return appropriate HTTP status codes for all error conditions (400, 404, 500, 503)

### Requirement 17: User Interface Design

**User Story:** As an ambulance driver, I want a clean, intuitive interface optimized for emergency use, so that I can operate the system quickly under stress.

#### Acceptance Criteria

1. THE Ambulance_System SHALL use large, touch-friendly buttons (minimum 44x44 pixels)
2. THE Ambulance_System SHALL use high-contrast colors for critical actions and alerts
3. THE Ambulance_System SHALL display the map as the primary interface element occupying most of the screen
4. THE Ambulance_System SHALL position controls in easily accessible locations (bottom or side panels)
5. THE Ambulance_System SHALL use clear, concise labels for all buttons and inputs
6. THE Ambulance_System SHALL provide visual feedback for all user interactions (button presses, selections)
7. THE Ambulance_System SHALL be usable in both portrait and landscape orientations on mobile devices

### Requirement 18: Performance Requirements

**User Story:** As an ambulance driver, I want the application to load and respond quickly, so that I don't waste time during emergencies.

#### Acceptance Criteria

1. THE Ambulance_System SHALL load the initial page within 3 seconds on a 3G mobile connection
2. THE Map_Visualizer SHALL render the map within 2 seconds of page load
3. THE Route_Calculator SHALL return route results within 5 seconds of request
4. THE Hospital_Locator SHALL return hospital results within 3 seconds of request
5. THE Navigation_Engine SHALL update ambulance position with less than 500ms latency
6. THE frontend SHALL minimize bundle size by code splitting and lazy loading non-critical components
7. THE backend SHALL respond to health check requests within 100ms
