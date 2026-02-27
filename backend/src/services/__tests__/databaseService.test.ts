/**
 * Database Service Tests
 * 
 * Unit tests for CRUD operations on all tables
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import {
  // User operations
  createUser,
  getUserById,
  getUserByUsername,
  updateUser,
  deleteUser,
  // Alert operations
  createAlert,
  getAlertById,
  getAlertsByAmbulanceId,
  getActiveAlerts,
  updateAlertStatus,
  updateAlert,
  deleteAlert,
  // Ambulance operations
  createAmbulance,
  getAmbulanceById,
  getAllAmbulances,
  updateAmbulance,
  deleteAmbulance,
  // Hospital operations
  createHospital,
  getHospitalById,
  getAllHospitals,
  updateHospital,
  deleteHospital,
  // Error types
  ValidationError,
  ItemNotFoundError
} from '../databaseService.js';
import { User } from '../../models/User.js';
import { Alert } from '../../models/Alert.js';
import { Ambulance } from '../../models/Ambulance.js';
import { Hospital } from '../../models/Hospital.js';

describe('Database Service - User Operations', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = uuidv4();
  });

  it('should create a user successfully', async () => {
    const user: User = {
      id: testUserId,
      username: `testuser_${Date.now()}`,
      passwordHash: 'hashedpassword123',
      role: 'ambulance',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await createUser(user);
    expect(result).toEqual(user);
  });

  it('should throw validation error when creating user without required fields', async () => {
    const invalidUser = {
      id: testUserId,
      username: 'testuser'
      // Missing passwordHash and role
    } as User;

    await expect(createUser(invalidUser)).rejects.toThrow(ValidationError);
  });

  it('should get user by ID', async () => {
    const user: User = {
      id: testUserId,
      username: `testuser_${Date.now()}`,
      passwordHash: 'hashedpassword123',
      role: 'police',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createUser(user);
    const result = await getUserById(testUserId);
    expect(result.id).toBe(testUserId);
    expect(result.username).toBe(user.username);
  });

  it('should throw ItemNotFoundError when user does not exist', async () => {
    const nonExistentId = uuidv4();
    await expect(getUserById(nonExistentId)).rejects.toThrow(ItemNotFoundError);
  });

  it('should get user by username', async () => {
    const username = `testuser_${Date.now()}`;
    const user: User = {
      id: testUserId,
      username,
      passwordHash: 'hashedpassword123',
      role: 'ambulance',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createUser(user);
    const result = await getUserByUsername(username);
    expect(result).not.toBeNull();
    expect(result?.username).toBe(username);
  });

  it('should return null when username does not exist', async () => {
    const result = await getUserByUsername('nonexistentuser_' + Date.now());
    expect(result).toBeNull();
  });

  it('should update user successfully', async () => {
    const user: User = {
      id: testUserId,
      username: `testuser_${Date.now()}`,
      passwordHash: 'hashedpassword123',
      role: 'ambulance',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createUser(user);
    
    const updates = {
      phoneNumber: '+1234567890'
    };
    
    const result = await updateUser(testUserId, updates);
    expect(result.phoneNumber).toBe('+1234567890');
    expect(result.updatedAt).not.toBe(user.updatedAt);
  });

  it('should throw validation error when updating with no fields', async () => {
    await expect(updateUser(testUserId, {})).rejects.toThrow(ValidationError);
  });

  it('should delete user successfully', async () => {
    const user: User = {
      id: testUserId,
      username: `testuser_${Date.now()}`,
      passwordHash: 'hashedpassword123',
      role: 'ambulance',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createUser(user);
    await deleteUser(testUserId);
    
    // Verify user is deleted
    await expect(getUserById(testUserId)).rejects.toThrow(ItemNotFoundError);
  });
});

describe('Database Service - Alert Operations', () => {
  let testAlertId: string;
  let testAmbulanceId: string;

  beforeEach(() => {
    testAlertId = uuidv4();
    testAmbulanceId = uuidv4();
  });

  it('should create an alert successfully', async () => {
    const alert: Alert = {
      id: testAlertId,
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Heavy traffic on route',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await createAlert(alert);
    expect(result).toEqual(alert);
  });

  it('should throw validation error when creating alert without required fields', async () => {
    const invalidAlert = {
      id: testAlertId,
      ambulanceId: testAmbulanceId
      // Missing other required fields
    } as Alert;

    await expect(createAlert(invalidAlert)).rejects.toThrow(ValidationError);
  });

  it('should get alert by ID', async () => {
    const alert: Alert = {
      id: testAlertId,
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Heavy traffic on route',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createAlert(alert);
    const result = await getAlertById(testAlertId);
    expect(result.id).toBe(testAlertId);
    expect(result.message).toBe(alert.message);
  });

  it('should get alerts by ambulance ID', async () => {
    const alert1: Alert = {
      id: uuidv4(),
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Alert 1',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const alert2: Alert = {
      id: uuidv4(),
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Alert 2',
      status: 'dispatched',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createAlert(alert1);
    await createAlert(alert2);

    const results = await getAlertsByAmbulanceId(testAmbulanceId);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some(a => a.id === alert1.id)).toBe(true);
    expect(results.some(a => a.id === alert2.id)).toBe(true);
  });

  it('should get active alerts', async () => {
    const pendingAlert: Alert = {
      id: uuidv4(),
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Pending alert',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const dispatchedAlert: Alert = {
      id: uuidv4(),
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Dispatched alert',
      status: 'dispatched',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createAlert(pendingAlert);
    await createAlert(dispatchedAlert);

    const results = await getActiveAlerts();
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every(a => a.status === 'pending' || a.status === 'dispatched')).toBe(true);
  });

  it('should update alert status', async () => {
    const alert: Alert = {
      id: testAlertId,
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Test alert',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createAlert(alert);
    const result = await updateAlertStatus(testAlertId, 'dispatched');
    expect(result.status).toBe('dispatched');
  });

  it('should add clearedAt timestamp when status is cleared', async () => {
    const alert: Alert = {
      id: testAlertId,
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Test alert',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createAlert(alert);
    const result = await updateAlertStatus(testAlertId, 'cleared');
    expect(result.status).toBe('cleared');
    expect(result.clearedAt).toBeDefined();
  });

  it('should throw validation error for invalid status', async () => {
    await expect(updateAlertStatus(testAlertId, 'invalid' as any)).rejects.toThrow(ValidationError);
  });

  it('should delete alert successfully', async () => {
    const alert: Alert = {
      id: testAlertId,
      ambulanceId: testAmbulanceId,
      ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 },
      congestionPoint: { lat: 40.7300, lng: -74.0000 },
      message: 'Test alert',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createAlert(alert);
    await deleteAlert(testAlertId);
    
    await expect(getAlertById(testAlertId)).rejects.toThrow(ItemNotFoundError);
  });
});

describe('Database Service - Ambulance Operations', () => {
  let testAmbulanceId: string;

  beforeEach(() => {
    testAmbulanceId = uuidv4();
  });

  it('should create an ambulance successfully', async () => {
    const ambulance: Ambulance = {
      id: testAmbulanceId,
      vehicleNumber: 'AMB-001',
      currentLocation: { lat: 40.7128, lng: -74.0060 },
      status: 'available',
      lastUpdated: new Date().toISOString()
    };

    const result = await createAmbulance(ambulance);
    expect(result).toEqual(ambulance);
  });

  it('should throw validation error when creating ambulance without required fields', async () => {
    const invalidAmbulance = {
      id: testAmbulanceId
      // Missing other required fields
    } as Ambulance;

    await expect(createAmbulance(invalidAmbulance)).rejects.toThrow(ValidationError);
  });

  it('should get ambulance by ID', async () => {
    const ambulance: Ambulance = {
      id: testAmbulanceId,
      vehicleNumber: 'AMB-002',
      currentLocation: { lat: 40.7128, lng: -74.0060 },
      status: 'en-route',
      lastUpdated: new Date().toISOString()
    };

    await createAmbulance(ambulance);
    const result = await getAmbulanceById(testAmbulanceId);
    expect(result.id).toBe(testAmbulanceId);
    expect(result.vehicleNumber).toBe('AMB-002');
  });

  it('should get all ambulances', async () => {
    const ambulance1: Ambulance = {
      id: uuidv4(),
      vehicleNumber: 'AMB-003',
      currentLocation: { lat: 40.7128, lng: -74.0060 },
      status: 'available',
      lastUpdated: new Date().toISOString()
    };

    const ambulance2: Ambulance = {
      id: uuidv4(),
      vehicleNumber: 'AMB-004',
      currentLocation: { lat: 40.7589, lng: -73.9851 },
      status: 'transporting',
      lastUpdated: new Date().toISOString()
    };

    await createAmbulance(ambulance1);
    await createAmbulance(ambulance2);

    const results = await getAllAmbulances();
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('should update ambulance successfully', async () => {
    const ambulance: Ambulance = {
      id: testAmbulanceId,
      vehicleNumber: 'AMB-005',
      currentLocation: { lat: 40.7128, lng: -74.0060 },
      status: 'available',
      lastUpdated: new Date().toISOString()
    };

    await createAmbulance(ambulance);
    
    const updates = {
      status: 'en-route' as const,
      currentLocation: { lat: 40.7300, lng: -74.0000 }
    };
    
    const result = await updateAmbulance(testAmbulanceId, updates);
    expect(result.status).toBe('en-route');
    expect(result.currentLocation.lat).toBe(40.7300);
  });

  it('should delete ambulance successfully', async () => {
    const ambulance: Ambulance = {
      id: testAmbulanceId,
      vehicleNumber: 'AMB-006',
      currentLocation: { lat: 40.7128, lng: -74.0060 },
      status: 'available',
      lastUpdated: new Date().toISOString()
    };

    await createAmbulance(ambulance);
    await deleteAmbulance(testAmbulanceId);
    
    await expect(getAmbulanceById(testAmbulanceId)).rejects.toThrow(ItemNotFoundError);
  });
});

describe('Database Service - Hospital Operations', () => {
  let testHospitalId: string;

  beforeEach(() => {
    testHospitalId = uuidv4();
  });

  it('should create a hospital successfully', async () => {
    const hospital: Hospital = {
      id: testHospitalId,
      name: 'Test General Hospital',
      location: { lat: 40.7128, lng: -74.0060 },
      address: '123 Main St, New York, NY',
      capacity: 500,
      emergencyCapable: true,
      phoneNumber: '+1234567890'
    };

    const result = await createHospital(hospital);
    expect(result).toEqual(hospital);
  });

  it('should throw validation error when creating hospital without required fields', async () => {
    const invalidHospital = {
      id: testHospitalId,
      name: 'Test Hospital'
      // Missing other required fields
    } as Hospital;

    await expect(createHospital(invalidHospital)).rejects.toThrow(ValidationError);
  });

  it('should throw validation error for negative capacity', async () => {
    const invalidHospital: Hospital = {
      id: testHospitalId,
      name: 'Test Hospital',
      location: { lat: 40.7128, lng: -74.0060 },
      address: '123 Main St',
      capacity: -10,
      emergencyCapable: true,
      phoneNumber: '+1234567890'
    };

    await expect(createHospital(invalidHospital)).rejects.toThrow(ValidationError);
  });

  it('should get hospital by ID', async () => {
    const hospital: Hospital = {
      id: testHospitalId,
      name: 'City Medical Center',
      location: { lat: 40.7589, lng: -73.9851 },
      address: '456 Park Ave, New York, NY',
      capacity: 300,
      emergencyCapable: true,
      phoneNumber: '+1987654321'
    };

    await createHospital(hospital);
    const result = await getHospitalById(testHospitalId);
    expect(result.id).toBe(testHospitalId);
    expect(result.name).toBe('City Medical Center');
  });

  it('should get all hospitals', async () => {
    const hospital1: Hospital = {
      id: uuidv4(),
      name: 'Hospital One',
      location: { lat: 40.7128, lng: -74.0060 },
      address: '111 First St',
      capacity: 200,
      emergencyCapable: true,
      phoneNumber: '+1111111111'
    };

    const hospital2: Hospital = {
      id: uuidv4(),
      name: 'Hospital Two',
      location: { lat: 40.7589, lng: -73.9851 },
      address: '222 Second St',
      capacity: 400,
      emergencyCapable: false,
      phoneNumber: '+2222222222'
    };

    await createHospital(hospital1);
    await createHospital(hospital2);

    const results = await getAllHospitals();
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('should update hospital successfully', async () => {
    const hospital: Hospital = {
      id: testHospitalId,
      name: 'Original Hospital',
      location: { lat: 40.7128, lng: -74.0060 },
      address: '789 Oak St',
      capacity: 250,
      emergencyCapable: true,
      phoneNumber: '+1555555555'
    };

    await createHospital(hospital);
    
    const updates = {
      capacity: 350,
      emergencyCapable: false
    };
    
    const result = await updateHospital(testHospitalId, updates);
    expect(result.capacity).toBe(350);
    expect(result.emergencyCapable).toBe(false);
  });

  it('should delete hospital successfully', async () => {
    const hospital: Hospital = {
      id: testHospitalId,
      name: 'Temporary Hospital',
      location: { lat: 40.7128, lng: -74.0060 },
      address: '999 Temp St',
      capacity: 100,
      emergencyCapable: true,
      phoneNumber: '+1999999999'
    };

    await createHospital(hospital);
    await deleteHospital(testHospitalId);
    
    await expect(getHospitalById(testHospitalId)).rejects.toThrow(ItemNotFoundError);
  });
});

describe('Database Service - Error Handling', () => {
  it('should throw validation error for empty ID', async () => {
    await expect(getUserById('')).rejects.toThrow(ValidationError);
    await expect(getAlertById('')).rejects.toThrow(ValidationError);
    await expect(getAmbulanceById('')).rejects.toThrow(ValidationError);
    await expect(getHospitalById('')).rejects.toThrow(ValidationError);
  });

  it('should throw validation error for empty username', async () => {
    await expect(getUserByUsername('')).rejects.toThrow(ValidationError);
  });

  it('should throw validation error for empty ambulance ID in query', async () => {
    await expect(getAlertsByAmbulanceId('')).rejects.toThrow(ValidationError);
  });
});
