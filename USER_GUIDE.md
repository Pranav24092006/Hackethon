# User Guide - Smart Emergency Route Optimizer

Welcome to the Smart Emergency Route Optimizer! This guide will help you get started with the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Ambulance Dashboard](#ambulance-dashboard)
3. [Police Dashboard](#police-dashboard)
4. [Simulation Mode](#simulation-mode)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## Getting Started

### Creating an Account

1. Open the application in your web browser
2. Click on the "Register" tab
3. Enter your details:
   - **Username**: Choose a unique username (3-50 characters)
   - **Password**: Create a secure password (minimum 8 characters)
   - **Role**: Select either "Ambulance" or "Police"
4. Click "Register"
5. You'll be automatically logged in and redirected to your dashboard

### Logging In

1. Open the application
2. Enter your username and password
3. Click "Login"
4. You'll be redirected to your role-specific dashboard

### Demo Accounts

For testing purposes, you can use these demo accounts:

**Ambulance Driver:**
- Username: `ambulance1`
- Password: `demo1234`

**Police Officer:**
- Username: `police1`
- Password: `demo1234`

---

## Ambulance Dashboard

The Ambulance Dashboard is designed for emergency vehicle drivers to find optimal routes and request assistance.

### Dashboard Overview

The dashboard consists of:
- **Interactive Map**: Shows your current location and route
- **Hospital Selector**: Choose your destination hospital
- **Route Information**: Distance, time, and traffic status
- **Emergency Alert Button**: Request police assistance
- **Connection Status**: Shows real-time connection status

### Finding a Route

1. **Select a Hospital**:
   - Use the dropdown menu at the top
   - Hospitals are sorted by distance from your location
   - Each hospital shows its name and distance

2. **View the Route**:
   - The route appears on the map automatically
   - Color-coded segments show traffic conditions:
     - **Green**: Light traffic (60+ km/h)
     - **Orange**: Moderate traffic (30-60 km/h)
     - **Red**: Heavy traffic (<30 km/h)

3. **Check Route Information**:
   - **Total Distance**: Route length in kilometers
   - **Estimated Time**: Expected travel time
   - **Traffic Status**: Overall congestion level

### Sending an Emergency Alert

When you encounter a traffic blockage:

1. Click the **"Emergency Alert"** button (red button with siren icon)
2. The alert is sent immediately to all police officers
3. You'll see a confirmation message
4. Wait for police response

### Receiving Police Updates

When police respond to your alert:

- **"Team Dispatched"**: Police are on their way
- **"Blockage Cleared"**: Route is clear, new route calculated automatically

Updates appear as notifications at the top of the screen.

### Real-Time Location Tracking

Your location is tracked in real-time:
- Your ambulance marker updates automatically
- Location is shared with police for coordination
- Map centers on your current position

---

## Police Dashboard

The Police Dashboard helps officers monitor emergency alerts and coordinate responses.

### Dashboard Overview

The dashboard consists of:
- **Interactive Map**: Shows ambulance locations and alert points
- **Alert Panel**: Lists all incoming emergency alerts
- **Action Buttons**: Dispatch team or mark blockage cleared
- **Connection Status**: Shows real-time connection status

### Viewing Alerts

The alert panel shows:
- **Ambulance ID**: Which ambulance sent the alert
- **Message**: Description of the emergency
- **Timestamp**: When the alert was created
- **Status**: Current alert status
- **Priority Badge**: 
  - **High**: Alert older than 10 minutes
  - **Medium**: Alert 5-10 minutes old
  - **Low**: Alert less than 5 minutes old

Alerts are sorted chronologically (newest first).

### Responding to Alerts

For each alert, you have two actions:

#### 1. Dispatch Team

Click "Dispatch Team" to:
- Send a police unit to the location
- Update alert status to "dispatched"
- Notify the ambulance driver

#### 2. Mark Cleared

Click "Mark Cleared" when:
- The blockage has been removed
- The route is safe for the ambulance
- This triggers automatic route recalculation for the ambulance

### Map Features

The map shows:
- **Ambulance Markers**: Real-time ambulance locations
- **Alert Points**: Where emergencies are reported
- **Hospital Markers**: Nearby hospitals

Click on an alert in the panel to center the map on that location.

---

## Simulation Mode

Simulation mode allows testing without real GPS or traffic data.

### What is Simulation Mode?

Simulation mode provides:
- **Simulated GPS Coordinates**: Fake location updates
- **Generated Traffic Data**: Realistic traffic patterns
- **Sample Hospitals**: Pre-loaded hospital locations

### When to Use Simulation Mode

Use simulation mode for:
- Testing the application
- Training new users
- Demonstrations
- Development and debugging

### How Simulation Works

In simulation mode:
1. GPS coordinates are generated along a predefined path
2. Traffic data follows realistic distribution (60% green, 30% orange, 10% red)
3. Location updates every 2 seconds
4. Sample hospitals are provided

### Enabling Simulation Mode

Simulation mode is automatically enabled when:
- No real GPS device is detected
- Running in development environment
- Configured in environment variables

---

## Troubleshooting

### Connection Issues

**Problem**: "Disconnected" status indicator

**Solutions**:
1. Check your internet connection
2. Refresh the page
3. Log out and log back in
4. Check if the server is running

---

### Route Not Calculating

**Problem**: No route appears after selecting hospital

**Solutions**:
1. Ensure you have a valid GPS location
2. Check if the hospital is within range
3. Verify the road network data is loaded
4. Try selecting a different hospital

---

### Alert Not Sending

**Problem**: Emergency alert button doesn't work

**Solutions**:
1. Ensure you've selected a destination first
2. Check your connection status
3. Verify you're logged in as an ambulance driver
4. Check browser console for errors

---

### Map Not Loading

**Problem**: Map appears blank or doesn't load

**Solutions**:
1. Check your internet connection (map tiles require internet)
2. Clear browser cache
3. Try a different browser
4. Disable browser extensions that might block map tiles

---

### Login Issues

**Problem**: Can't log in with correct credentials

**Solutions**:
1. Verify username and password are correct
2. Check if Caps Lock is on
3. Try resetting your password
4. Contact administrator if account is locked

---

## FAQ

### How accurate is the route calculation?

Routes are calculated using real road network data and current traffic conditions. Accuracy depends on:
- Quality of road network data
- Real-time traffic data availability
- GPS accuracy

### How often is traffic data updated?

Traffic data is updated every 30 seconds to provide near real-time information.

### Can I use this without internet?

No, the application requires internet connection for:
- Map tiles (OpenStreetMap)
- Real-time communication (WebSocket)
- API requests to backend

### How many hospitals can I see?

The hospital list shows all hospitals in the database, sorted by distance from your current location.

### What happens if I lose connection?

The application will:
- Show "Disconnected" status
- Attempt automatic reconnection
- Queue messages for when connection is restored
- Retain your current route and location

### Can multiple ambulances use the system simultaneously?

Yes, the system supports multiple concurrent users:
- Each ambulance has its own location tracking
- Alerts are broadcast to all police officers
- Routes are calculated independently

### How long do alerts stay active?

Alerts remain active until:
- Police mark them as "cleared"
- They expire after 2 hours (automatic cleanup)
- System administrator manually removes them

### Is my location data private?

Location data is:
- Only shared with authenticated police officers
- Not stored permanently (only current location)
- Transmitted over secure WebSocket connection
- Used only for emergency coordination

### Can I change my password?

Currently, password changes must be done by contacting the system administrator. This feature will be added in a future update.

### What browsers are supported?

The application works best on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Mobile browsers are also supported.

### How do I report a bug?

To report bugs:
1. Note the exact steps to reproduce
2. Take screenshots if possible
3. Check browser console for errors
4. Contact your system administrator

### Can I use this on mobile devices?

Yes! The application is fully responsive and works on:
- Smartphones (iOS and Android)
- Tablets
- Desktop computers

### What if there's no route available?

If no route is found:
- Check if destination is accessible by road
- Try a different hospital
- Verify your current location is valid
- Contact dispatch for alternative routing

---

## Getting Help

### Support Channels

- **Technical Issues**: Contact IT support
- **Account Issues**: Contact administrator
- **Emergency**: Use traditional emergency protocols

### Training Resources

- Video tutorials: Available on internal portal
- Training sessions: Scheduled monthly
- Quick reference guide: Available for download

### Feedback

We welcome your feedback! Please share:
- Feature requests
- Usability improvements
- Bug reports
- General comments

Contact: support@emergency-route-optimizer.com

---

## Best Practices

### For Ambulance Drivers

1. **Always select destination before departing**
2. **Send alerts immediately when encountering blockages**
3. **Keep the application open during transit**
4. **Monitor route updates for cleared blockages**
5. **Verify hospital selection before starting route**

### For Police Officers

1. **Monitor alert panel continuously**
2. **Respond to high-priority alerts first**
3. **Update alert status promptly**
4. **Coordinate with dispatch for team deployment**
5. **Mark blockages cleared only when confirmed**

### General Tips

1. **Keep your device charged**
2. **Ensure stable internet connection**
3. **Update browser regularly**
4. **Log out when not in use**
5. **Report issues immediately**

---

## Keyboard Shortcuts

- **Ctrl/Cmd + R**: Refresh page
- **Esc**: Close modals/dialogs
- **Tab**: Navigate between fields
- **Enter**: Submit forms

---

## Accessibility

The application supports:
- Screen readers
- Keyboard navigation
- High contrast mode
- Adjustable text size

For accessibility assistance, contact support.

---

**Last Updated**: Current session
**Version**: 1.0.0
**Support**: support@emergency-route-optimizer.com
