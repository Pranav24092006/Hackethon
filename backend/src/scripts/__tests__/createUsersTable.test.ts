/**
 * Unit tests for Users table creation script
 */

import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { createUsersTable } from '../createUsersTable';

// Mock the DynamoDB client
jest.mock('@aws-sdk/client-dynamodb');

const mockSend = jest.fn();

describe('createUsersTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({
      send: mockSend
    }));
  });

  it('should create Users table with correct schema', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Users',
        TableArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/Users',
        TableStatus: 'CREATING'
      }
    });

    await createUsersTable();

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(CreateTableCommand);
    expect(command.input.TableName).toBe('Users');
    expect(command.input.KeySchema).toEqual([
      { AttributeName: 'id', KeyType: 'HASH' }
    ]);
  });

  it('should create username-index global secondary index', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Users',
        TableStatus: 'CREATING'
      }
    });

    await createUsersTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.GlobalSecondaryIndexes).toBeDefined();
    expect(command.input.GlobalSecondaryIndexes?.length).toBe(1);
    expect(command.input.GlobalSecondaryIndexes?.[0].IndexName).toBe('username-index');
    expect(command.input.GlobalSecondaryIndexes?.[0].KeySchema).toEqual([
      { AttributeName: 'username', KeyType: 'HASH' }
    ]);
  });

  it('should define id and username attributes', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Users',
        TableStatus: 'CREATING'
      }
    });

    await createUsersTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.AttributeDefinitions).toEqual([
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'username', AttributeType: 'S' }
    ]);
  });

  it('should use Free Tier provisioned throughput', async () => {
    mockSend.mockResolvedValue({
      TableDescription: {
        TableName: 'Users',
        TableStatus: 'CREATING'
      }
    });

    await createUsersTable();

    const command = mockSend.mock.calls[0][0];
    expect(command.input.ProvisionedThroughput).toEqual({
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    });

    expect(command.input.GlobalSecondaryIndexes?.[0].ProvisionedThroughput).toEqual({
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    });
  });

  it('should handle ResourceInUseException when table already exists', async () => {
    const error = new Error('Table already exists');
    error.name = 'ResourceInUseException';
    mockSend.mockRejectedValue(error);

    // Should not throw
    await expect(createUsersTable()).resolves.not.toThrow();
  });

  it('should throw error for other exceptions', async () => {
    const error = new Error('Network error');
    error.name = 'NetworkError';
    mockSend.mockRejectedValue(error);

    await expect(createUsersTable()).rejects.toThrow('Network error');
  });
});
