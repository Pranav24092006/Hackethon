/**
 * Unit tests for Ambulances table creation script
 */

import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { createAmbulancesTable } from '../createAmbulancesTable';

// Mock the DynamoDB client
jest.mock('@aws-sdk/client-dynamodb');

const mockSend = jest.fn();

describe('createAmbulancesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({
      send: mockSend
    }));
  });

  it('should create Ambulances table with correct schema', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Ambulances',
        TableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/Ambulances',
        TableStatus: 'CREATING'
      }
    });

    await createAmbulancesTable();

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(CreateTableCommand);
    expect(command.input.TableName).toBe('Ambulances');
    expect(command.input.KeySchema).toEqual([
      { AttributeName: 'id', KeyType: 'HASH' }
    ]);
  });

  it('should define id attribute', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Ambulances',
        TableStatus: 'CREATING'
      }
    });

    await createAmbulancesTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.AttributeDefinitions).toEqual([
      { AttributeName: 'id', AttributeType: 'S' }
    ]);
  });

  it('should use Free Tier provisioned throughput', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Ambulances',
        TableStatus: 'CREATING'
      }
    });

    await createAmbulancesTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.ProvisionedThroughput).toEqual({
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    });
  });

  it('should not have global secondary indexes', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Ambulances',
        TableStatus: 'CREATING'
      }
    });

    await createAmbulancesTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.GlobalSecondaryIndexes).toBeUndefined();
  });

  it('should handle ResourceInUseException when table already exists', async () => {
    const error = new Error('Table already exists');
    error.name = 'ResourceInUseException';
    mockSend.mockRejectedValue(error);

    // Should not throw
    await expect(createAmbulancesTable()).resolves.not.toThrow();
  });

  it('should throw error for other exceptions', async () => {
    const error = new Error('Network error');
    error.name = 'NetworkError';
    mockSend.mockRejectedValue(error);

    await expect(createAmbulancesTable()).rejects.toThrow('Network error');
  });
});
