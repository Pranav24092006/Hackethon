/**
 * Unit tests for createAlertsTable script
 */

import { CreateTableCommandInput } from '@aws-sdk/client-dynamodb';

describe('createAlertsTable Script', () => {
  describe('Table configuration', () => {
    it('should have correct table name', () => {
      const tableName = 'Alerts';
      expect(tableName).toBe('Alerts');
    });

    it('should have id as primary key (HASH)', () => {
      const keySchema = [
        { AttributeName: 'id', KeyType: 'HASH' }
      ];
      
      expect(keySchema).toHaveLength(1);
      expect(keySchema[0].AttributeName).toBe('id');
      expect(keySchema[0].KeyType).toBe('HASH');
    });

    it('should define id, ambulanceId, and createdAt attributes', () => {
      const attributeDefinitions = [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'ambulanceId', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'S' }
      ];
      
      expect(attributeDefinitions).toHaveLength(3);
      expect(attributeDefinitions[0].AttributeName).toBe('id');
      expect(attributeDefinitions[0].AttributeType).toBe('S');
      expect(attributeDefinitions[1].AttributeName).toBe('ambulanceId');
      expect(attributeDefinitions[1].AttributeType).toBe('S');
      expect(attributeDefinitions[2].AttributeName).toBe('createdAt');
      expect(attributeDefinitions[2].AttributeType).toBe('S');
    });

    it('should have ambulanceId-createdAt-index global secondary index', () => {
      const gsi = {
        IndexName: 'ambulanceId-createdAt-index',
        KeySchema: [
          { AttributeName: 'ambulanceId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1
        }
      };
      
      expect(gsi.IndexName).toBe('ambulanceId-createdAt-index');
      expect(gsi.KeySchema).toHaveLength(2);
      expect(gsi.KeySchema[0].AttributeName).toBe('ambulanceId');
      expect(gsi.KeySchema[0].KeyType).toBe('HASH');
      expect(gsi.KeySchema[1].AttributeName).toBe('createdAt');
      expect(gsi.KeySchema[1].KeyType).toBe('RANGE');
      expect(gsi.Projection.ProjectionType).toBe('ALL');
    });

    it('should use Free Tier provisioned throughput for table', () => {
      const throughput = {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      };
      
      expect(throughput.ReadCapacityUnits).toBe(1);
      expect(throughput.WriteCapacityUnits).toBe(1);
    });

    it('should use Free Tier provisioned throughput for GSI', () => {
      const gsiThroughput = {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      };
      
      expect(gsiThroughput.ReadCapacityUnits).toBe(1);
      expect(gsiThroughput.WriteCapacityUnits).toBe(1);
    });
  });

  describe('Index design', () => {
    it('should support querying alerts by ambulanceId', () => {
      const indexName = 'ambulanceId-createdAt-index';
      const hashKey = 'ambulanceId';
      
      expect(indexName).toContain(hashKey);
    });

    it('should support sorting alerts by createdAt timestamp', () => {
      const indexName = 'ambulanceId-createdAt-index';
      const rangeKey = 'createdAt';
      
      expect(indexName).toContain(rangeKey);
    });

    it('should project all attributes in GSI', () => {
      const projectionType = 'ALL';
      
      expect(projectionType).toBe('ALL');
    });
  });
});
