/**
 * Manual test for Road Network Service
 * Run this with: tsx src/services/__tests__/roadNetworkService.manual.test.ts
 */

import { roadNetworkService } from '../roadNetworkService.js';
import { OSMData } from '../../models/RoadNetwork.js';

async function runTests() {
  console.log('Testing Road Network Service...\n');

  try {
    // Test 1: Load road network
    console.log('Test 1: Loading road network...');
    const network = await roadNetworkService.getRoadNetwork();
    console.log(`✓ Network loaded with ${network.nodes.size} nodes and ${network.edges.size} edge groups`);

    // Test 2: Verify sample network structure
    console.log('\nTest 2: Verifying sample network structure...');
    if (network.nodes.size === 25) {
      console.log('✓ Sample network has correct number of nodes (25)');
    } else {
      console.log(`✗ Expected 25 nodes, got ${network.nodes.size}`);
    }

    // Test 3: Check bidirectional edges
    console.log('\nTest 3: Checking bidirectional edges...');
    const node0_0Edges = network.edges.get('node_0_0');
    if (node0_0Edges && node0_0Edges.length >= 2) {
      console.log(`✓ Corner node has ${node0_0Edges.length} edges`);
    } else {
      console.log(`✗ Corner node should have at least 2 edges`);
    }

    // Test 4: Calculate distance
    console.log('\nTest 4: Calculating distance...');
    const coord1 = { lat: 40.7128, lng: -74.006 };
    const coord2 = { lat: 40.7138, lng: -74.006 };
    const distance = roadNetworkService.calculateDistance(coord1, coord2);
    console.log(`✓ Distance calculated: ${distance.toFixed(4)} km`);

    // Test 5: Find nearest node
    console.log('\nTest 5: Finding nearest node...');
    const nearestNode = roadNetworkService.findNearestNode({ lat: 40.7128, lng: -74.006 });
    if (nearestNode) {
      console.log(`✓ Found nearest node: ${nearestNode.id} at (${nearestNode.coordinates.lat}, ${nearestNode.coordinates.lng})`);
    } else {
      console.log('✗ Failed to find nearest node');
    }

    // Test 6: Update congestion weight
    console.log('\nTest 6: Updating congestion weight...');
    const firstNodeId = Array.from(network.edges.keys())[0];
    const firstEdge = network.edges.get(firstNodeId)![0];
    roadNetworkService.updateCongestionWeight(firstEdge.from, firstEdge.to, 2.5);
    const updatedEdge = network.edges.get(firstEdge.from)!.find(e => e.to === firstEdge.to);
    if (updatedEdge?.congestionWeight === 2.5) {
      console.log('✓ Congestion weight updated successfully');
    } else {
      console.log('✗ Failed to update congestion weight');
    }

    // Test 7: Parse OSM data
    console.log('\nTest 7: Parsing OSM data...');
    const osmData: OSMData = {
      nodes: [
        { id: 'n1', lat: 40.7128, lon: -74.006 },
        { id: 'n2', lat: 40.7138, lon: -74.006 },
        { id: 'n3', lat: 40.7148, lon: -74.006 },
      ],
      ways: [
        {
          id: 'w1',
          nodes: ['n1', 'n2', 'n3'],
          tags: { highway: 'primary' },
        },
      ],
    };
    const parsedNetwork = roadNetworkService.parseOSMData(osmData);
    console.log(`✓ Parsed OSM data: ${parsedNetwork.nodes.size} nodes, ${parsedNetwork.edges.size} edge groups`);

    // Test 8: Cache functionality
    console.log('\nTest 8: Testing cache...');
    const network1 = await roadNetworkService.getRoadNetwork();
    const network2 = await roadNetworkService.getRoadNetwork();
    if (network1 === network2) {
      console.log('✓ Cache is working (same instance returned)');
    } else {
      console.log('✗ Cache not working (different instances)');
    }

    roadNetworkService.clearCache();
    const network3 = await roadNetworkService.getRoadNetwork();
    if (network1 !== network3) {
      console.log('✓ Cache cleared successfully (new instance after clear)');
    } else {
      console.log('✗ Cache clear failed (same instance)');
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTests();
