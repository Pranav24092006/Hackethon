/**
 * Unit tests for Hospitals table creation script
 */

import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { createHospitalsTable } from '../createHospitalsTable';

// Mock the DynamoDB client
jest.mock('@aws-sdk/client-dynamodb');

const mockSend = jest.fn();

describe('createHospitalsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({
      send: mockSend
    }));
  });

  it('should create Hospitals table with correct schema', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Hospitals',
        TableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/Hospitals',
        TableStatus: 'CREATING'
      }
    });

    await createHospitalsTable();

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(CreateTableCommand);
    expect(command.input.TableName).toBe('Hospitals');
    expect(command.input.KeySchema).toEqual([
      { AttributeName: 'id', KeyType: 'HASH' }
    ]);
  });

  it('should define id attribute', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Hospitals',
        TableStatus: 'CREATING'
      }
    });

    await createHospitalsTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.AttributeDefinitions).toEqual([
      { AttributeName: 'id', AttributeType: 'S' }
    ]);
  });

  it('should use Free Tier provisioned throughput', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Hospitals',
        TableStatus: 'CREATING'
      }
    });

    await createHospitalsTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.ProvisionedThroughput).toEqual({
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    });
  });

  it('should not have global secondary indexes', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Hospitals',
        TableStatus: 'CREATING'
      }
    });

    await createHospitalsTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.GlobalSecondaryIndexes).toBeUndefined();
  });

  it('should handle ResourceInUseException when table already exists', async () => {
    const error = new Error('Table already exists');
    error.name = 'ResourceInUseException';
    mockSend.mockRejectedValue(error);

    // Should not throw
    await expect(createHospitalsTable()).resolves.not.toThrow();
  });

  it('should throw error for other exceptions', async () => {
    const error = new Error('Network error');
    error.name = 'NetworkError';
    mockSend.mockRejectedValue(error);

    await expect(createHospitalsTable()).rejects.toThrow('Network error');
  });

  it('should log success message when table is created', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Hospitals',
        TableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/Hospitals',
        TableStatus: 'CREATING'
      }
    });

    await createHospitalsTable();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Hospitals table created successfully:',
      'Hospitals'
    );
    
    consoleSpy.mockRestore();
  });

  it('should log message when table already exists', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const error = new Error('Table already exists');
    error.name = 'ResourceInUseException';
    mockSend.mockRejectedValue(error);

    await createHospitalsTable();

    expect(consoleSpy).toHaveBeenCalledWith('Hospitals table already exists');
    
    consoleSpy.mockRestore();
  });
});
