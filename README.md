# Smart Emergency Route Optimizer

A full-stack web application designed to reduce ambulance travel time during emergencies by detecting traffic congestion and automatically alerting nearby police to clear blockages.

## Features

- **Real-time Route Optimization**: A* algorithm-based pathfinding with traffic-aware cost function
- **Live Traffic Visualization**: Color-coded road segments showing congestion levels
- **Emergency Alert System**: Instant notifications between ambulances and police via WebSocket and SMS
- **Interactive Dashboards**: Separate interfaces for ambulance drivers and police control centers
- **Simulation Mode**: Demo mode with simulated GPS and traffic data for testing
- **AWS Integration**: Scalable infrastructure using DynamoDB, SNS, and EC2

## Technology Stack

### Frontend
- React 18 with TypeScript
- Leaflet.js for interactive maps
- Framer Motion for animations
- Socket.io for real-time communication
- Tailwind CSS for styling
- Vite for build tooling

### Backend
- Node.js 18+ with Express
- Socket.io for WebSocket server
- AWS SDK (DynamoDB, SNS, CloudWatch)
- JWT for authentication
- bcrypt for password hashing

## Project Structure

```
smart-emergency-route-optimizer/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API and Socket.io services
│   │   ├── types/         # TypeScript type definitions
│   │   └── __properties__/ # Property-based tests
│   └── package.json
├── backend/               # Node.js backend application
│   ├── src/
│   │   ├── services/      # Business logic services
│   │   ├── routes/        # API routes
│   │   ├── models/        # Data models
│   │   └── __properties__/ # Property-based tests
│   └── package.json
└── package.json           # Root package.json for monorepo
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- AWS account (for DynamoDB, SNS, EC2)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smart-emergency-route-optimizer
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your AWS credentials and configuration
```

### Development

Run both frontend and backend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Frontend (runs on http://localhost:5173)
npm run dev:frontend

# Backend (runs on http://localhost:3000)
npm run dev:backend
```

### Testing

Run all tests:
```bash
npm test
```

Run tests for specific workspace:
```bash
npm run test:frontend
npm run test:backend
```

### Building

Build both frontend and backend:
```bash
npm run build
```

### Linting and Formatting

```bash
# Lint all code
npm run lint

# Format all code
npm run format
```

## AWS Setup

### DynamoDB Tables

Create the following tables in AWS DynamoDB:
- `Users` - User accounts with authentication
- `Alerts` - Emergency alerts from ambulances
- `Ambulances` - Ambulance location and status
- `Hospitals` - Hospital locations and information

### SNS Configuration

1. Create an SNS topic for emergency alerts
2. Configure SMS sending permissions
3. Update `SNS_TOPIC_ARN` in backend/.env

### EC2 Deployment

1. Launch an EC2 t2.micro instance (Free Tier eligible)
2. Configure security groups for HTTP/HTTPS and WebSocket
3. Deploy the application using the provided deployment scripts

## Environment Variables

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_SOCKET_URL` - WebSocket server URL
- `VITE_MAP_TILE_URL` - OpenStreetMap tile server URL
- `VITE_SIMULATION_MODE` - Enable/disable simulation mode

### Backend (.env)
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens
- `AWS_REGION` - AWS region
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `DYNAMODB_*_TABLE` - DynamoDB table names
- `SNS_TOPIC_ARN` - SNS topic ARN for SMS notifications

## Testing Strategy

The project uses a dual testing approach:

1. **Unit Tests**: Specific examples and edge cases
2. **Property-Based Tests**: Universal properties using fast-check library

All property tests include minimum 100 iterations and are tagged with references to the design document.

## License

MIT

## Project Status

- **Backend**: 100% Complete ✅
- **Frontend**: 100% Complete ✅
- **AWS Infrastructure**: 100% Complete ✅
- **Error Handling**: 100% Complete ✅
- **Documentation**: 100% Complete ✅
- **Testing**: 100% Unit Tests ✅

**Overall Completion: 100%** 🎉

For detailed documentation, see:
- [API Documentation](API_DOCUMENTATION.md)
- [User Guide](USER_GUIDE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [AWS Setup Guide](backend/src/scripts/README_AWS_SETUP.md)

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
