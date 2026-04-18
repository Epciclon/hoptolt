/**
 * Jest setup file for Rabbit Management System tests
 * This file runs before each test suite
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Global variables for test environment
let mongoServer;

// Setup before all tests
beforeAll(async () => {
    // Setup in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

// Cleanup after each test
afterEach(async () => {
    // Clear all collections after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

// Cleanup after all tests
afterAll(async () => {
    // Close database connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    
    // Stop in-memory MongoDB instance
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// Global test configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

// Mock console.error to avoid noise in test output unless debugging
const originalConsoleError = console.error;
beforeAll(() => {
    if (process.env.NODE_ENV !== 'debug') {
        console.error = jest.fn();
    }
});

afterAll(() => {
    console.error = originalConsoleError;
});

// Environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'test-will-be-overridden-by-memory-server';
