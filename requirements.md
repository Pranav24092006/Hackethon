# Requirements Document

## Introduction

The Smart Ambulance Route Finder is a production-ready web application designed to help ambulances in India find the fastest, traffic-aware routes to nearest hospitals during emergencies. The system addresses critical delays caused by traffic congestion, lack of emergency-optimized navigation, and poor coordination with hospitals by providing real-time, traffic-aware routing optimized specifically for emergency scenarios.

## Glossary

- **System**: The Smart Ambulance Route Finder web application
- **Ambulance_Operator**: The person operating the ambulance and using the system
- **Emergency_Session**: A single emergency event from ambulance dispatch to hospital arrival
- **Route_Engine**: The backend service that calculates optimal routes
- **Hospital_Discovery_Service**: The backend service that finds nearby hospitals
- **Navigation_Mode**: Active state where the system provides turn-by-turn guidance
- **Best_Route**: The route with shortest ETA and least traffic congestion
- **Traffic_Route**: Alternative route showing high congestion areas
- **MapMyIndia_API**: External mapping and routing service provider
- **Backend_Service**: AWS Lambda functions handling API calls and business logic
- **Frontend_Application**: React-based user interface
- **Emergency_Type**: Classification of medical emergency (Road Accident, Cardiac, Trauma, Fire Injury, Pregnancy)

## Requirements

### Requirement 1: Ambulance Location Detection

**User Story:** As an Ambulance_Operator, I want to input my current location, so that the system can calculate routes from my position.

#### Acceptance Criteria

1. WHEN the Ambulance_Operator opens the application, THE System SHALL attempt to detect location using browser GPS
2. WHEN GPS detection fails or is denied, THE System SHALL provide manual input options for latitude/longitude coordinates
3. WHEN GPS detection fails or is denied, THE System SHALL provide a place search input field
4. WHEN a location is provided, THE System SHALL validate that the coordinates are within India's geographic boundaries (latitude 8° to 37°N, longitude 68° to 97°E)
5. WHEN a valid location is confirmed, THE System SHALL display an ambulance marker (🚑) on the map at that location
6. IF location coordinates are outside India's boundaries, THEN THE System SHALL display an error message and prevent route calculation

### Requirement 2: Emergency Type Classification

**User Story:** As an Ambulance_Operator, I want to specify the type of emergency, so that the system can prioritize and log the emergency appropriately.

#### Acceptance Criteria

1. THE System SHALL provide a dropdown selection with exactly five emergency types: Road Accident, Cardiac Emergency, Trauma, Fire Injury, Pregnancy Emergency
2. WHEN an emergency type is selected, THE System SHALL store the selection in the Emergency_Session
3. WHEN route calculation is requested, THE System SHALL include the emergency type in the backend request

### Requirement 3: Hospital Discovery

**User Story:** As an Ambulance_Operator, I want to see nearby hospitals, so that I can select the most appropriate destination.

#### Acceptance Criteria

1. WHEN a valid ambulance location is provided, THE Backend_Service SHALL query the MapMyIndia_API for nearby hospitals
2. WHEN the MapMyIndia_API returns hospital data, THE System SHALL display hospital markers (🏥) on the map
3. WHEN the MapMyIndia_API fails or returns no results, THE System SHALL load a fallback demo hospital dataset
4. THE System SHALL allow the Ambulance_Operator to select a hospital from the displayed options
5. WHEN a hospital is selected, THE System SHALL highlight the selected hospital marker on the map

### Requirement 4: Traffic-Aware Route Calculation

**User Story:** As an Ambulance_Operator, I want to see the fastest route considering current traffic, so that I can reach the hospital in minimum time.

#### Acceptance Criteria

1. WHEN an ambulance location and hospital are selected, THE Route_Engine SHALL request multiple route options from MapMyIndia_API
2. WHEN route data is received, THE Route_Engine SHALL analyze each route for distance, ETA, and traffic congestion levels
3. THE Route_Engine SHALL identify the Best_Route as the route with shortest ETA and least traffic congestion
4. THE Route_Engine SHALL identify the Traffic_Route as an alternative route showing high congestion areas
5. THE System SHALL return both Best_Route and Traffic_Route to the Frontend_Application
6. WHEN route calculation fails, THE System SHALL display an error message and allow retry

### Requirement 5: Route Visualization

**User Story:** As an Ambulance_Operator, I want to see routes visually on a map, so that I can understand the path and traffic conditions.

#### Acceptance Criteria

1. WHEN routes are calculated, THE System SHALL draw the Best_Route as a blue polyline on the map
2. WHEN routes are calculated, THE System SHALL draw the Traffic_Route as a red polyline on the map
3. THE System SHALL automatically adjust the map zoom and center to fit both routes and markers
4. THE System SHALL display a traffic legend indicating blue represents low traffic and red represents high traffic
5. THE System SHALL maintain visibility of ambulance marker, hospital marker, and both route polylines simultaneously

### Requirement 6: Navigation Mode

**User Story:** As an Ambulance_Operator, I want turn-by-turn navigation, so that I can follow the route without checking the map constantly.

#### Acceptance Criteria

1. THE System SHALL provide a "Start Emergency Route" button when a route is calculated
2. WHEN the button is clicked, THE System SHALL enter Navigation_Mode
3. WHILE in Navigation_Mode, THE System SHALL animate the ambulance marker moving along the Best_Route
4. WHILE in Navigation_Mode, THE System SHALL display remaining distance to hospital
5. WHILE in Navigation_Mode, THE System SHALL display estimated time of arrival
6. WHILE in Navigation_Mode, THE System SHALL display turn-by-turn instructions
7. WHILE in Navigation_Mode, THE System SHALL periodically poll the Backend_Service for route recalculation based on updated traffic
8. WHEN route recalculation returns a faster route, THE System SHALL update the displayed route and navigation instructions

### Requirement 7: Emergency Alert Display

**User Story:** As an Ambulance_Operator, I want to display an emergency alert, so that the system is ready for future traffic signal integration.

#### Acceptance Criteria

1. WHILE in Navigation_Mode, THE System SHALL display a prominent banner with the message "🚨 AMBULANCE ON THE WAY – PLEASE CLEAR THE ROUTE"
2. THE System SHALL design the alert banner to support future integration with traffic signal systems

### Requirement 8: Arrival Detection

**User Story:** As an Ambulance_Operator, I want the system to detect when I reach the hospital, so that the emergency session can be completed.

#### Acceptance Criteria

1. WHILE in Navigation_Mode, THE System SHALL continuously monitor the distance between ambulance position and hospital location
2. WHEN the distance is less than 50 meters, THE System SHALL detect arrival at the hospital
3. WHEN arrival is detected, THE System SHALL exit Navigation_Mode
4. WHEN arrival is detected, THE System SHALL display the message "✅ Destination Reached – Patient Delivered"
5. WHEN arrival is detected, THE System SHALL reset the Emergency_Session for the next emergency

### Requirement 9: API Security and Configuration

**User Story:** As a system administrator, I want API keys secured, so that the system prevents unauthorized access and API abuse.

#### Acceptance Criteria

1. THE Frontend_Application SHALL NOT contain any API keys in source code or configuration files
2. THE Backend_Service SHALL store all API keys in AWS Lambda environment variables
3. THE Backend_Service SHALL be the only component making calls to MapMyIndia_API
4. THE System SHALL enable CORS on API Gateway to allow frontend requests
5. THE Backend_Service SHALL validate all incoming requests before processing

### Requirement 10: Error Handling and Resilience

**User Story:** As an Ambulance_Operator, I want the system to handle errors gracefully, so that I can continue using it during emergencies even when services fail.

#### Acceptance Criteria

1. WHEN any external API call fails, THE System SHALL display a user-friendly error message
2. WHEN MapMyIndia_API is unavailable, THE System SHALL fall back to demo hospital data
3. WHEN network connectivity is lost, THE System SHALL display a connectivity warning
4. WHEN GPS detection fails, THE System SHALL provide alternative input methods
5. THE System SHALL log all errors to Amazon CloudWatch for monitoring

### Requirement 11: Geographic Scope

**User Story:** As a system administrator, I want the system to work anywhere in India, so that it can serve all regions.

#### Acceptance Criteria

1. THE System SHALL accept any valid latitude/longitude coordinates within India's boundaries
2. THE System SHALL use MapMyIndia_API as the primary mapping provider for India-specific data
3. WHEN coordinates are outside India, THE System SHALL reject the input and display an appropriate message

### Requirement 12: Data Storage

**User Story:** As a system administrator, I want emergency session data stored, so that the system can track active emergencies and support analytics.

#### Acceptance Criteria

1. WHEN an Emergency_Session begins, THE Backend_Service SHALL create a record in DynamoDB
2. THE System SHALL store ambulance location, hospital location, emergency type, and timestamp
3. WHEN Navigation_Mode is active, THE System SHALL update the session with current status
4. WHEN arrival is detected, THE System SHALL mark the session as completed in DynamoDB
5. THE System SHALL use DynamoDB's free tier efficiently to minimize costs

### Requirement 13: Frontend Architecture

**User Story:** As a developer, I want a modern, maintainable frontend, so that the system is easy to extend and debug.

#### Acceptance Criteria

1. THE Frontend_Application SHALL be built using React with Hooks
2. THE Frontend_Application SHALL use Leaflet with OpenStreetMap OR Mapbox GL JS for map rendering
3. THE Frontend_Application SHALL use the Fetch API for all backend communication
4. THE Frontend_Application SHALL implement responsive design for mobile and tablet devices
5. THE Frontend_Application SHALL manage state using React Hooks (useState, useEffect, useContext)

### Requirement 14: Backend Architecture

**User Story:** As a developer, I want a serverless, scalable backend, so that the system can handle variable load without infrastructure management.

#### Acceptance Criteria

1. THE Backend_Service SHALL be implemented using AWS Lambda functions
2. THE Backend_Service SHALL expose REST APIs through Amazon API Gateway
3. THE Backend_Service SHALL use Node.js as the runtime environment
4. THE Backend_Service SHALL remain within AWS Free Tier limits for all services
5. THE Backend_Service SHALL implement proper error handling and logging

### Requirement 15: API Endpoints

**User Story:** As a developer, I want well-defined API endpoints, so that frontend and backend can communicate reliably.

#### Acceptance Criteria

1. THE Backend_Service SHALL provide a GET /hospitals endpoint accepting lat and lng query parameters
2. THE Backend_Service SHALL provide a POST /route endpoint accepting ambulance_lat, ambulance_lng, hospital_lat, and hospital_lng in the request body
3. THE Backend_Service SHALL provide a POST /session endpoint for creating Emergency_Session records
4. THE Backend_Service SHALL provide a PUT /session/:id endpoint for updating Emergency_Session status
5. THE Backend_Service SHALL return JSON responses with appropriate HTTP status codes
