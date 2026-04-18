/**
 * Test helpers for creating mock data
 * Following the Arrange, Act, Assert pattern
 */

const User = require('../../src/models/user');
const Rabbit = require('../../src/models/rabbit');
const Race = require('../../src/models/race');
const Cage = require('../../src/models/cage');
const Feeding = require('../../src/models/feeding');
const Vaccination = require('../../src/models/vaccination');
const Deworming = require('../../src/models/deworming');
const Mating = require('../../src/models/mating');
const AssignRabbit = require('../../src/models/assignRabbit');
const jwt = require('jsonwebtoken');

/**
 * Create a test user
 * @param {Object} overrides - Properties to override default user data
 * @returns {Object} Created user
 */
const createTestUser = async (overrides = {}) => {
    const defaultUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee',
        isActive: true
    };

    const userData = { ...defaultUserData, ...overrides };
    const user = new User(userData);
    await user.save();
    return user;
};

/**
 * Create a test admin user
 * @param {Object} overrides - Properties to override default admin data
 * @returns {Object} Created admin user
 */
const createTestAdmin = async (overrides = {}) => {
    return createTestUser({
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        ...overrides
    });
};

/**
 * Create a test race
 * @param {Object} overrides - Properties to override default race data
 * @returns {Object} Created race
 */
const createTestRace = async (overrides = {}) => {
    const defaultRaceData = {
        name: 'TestRace',
        description: 'A test race for unit testing purposes'
    };

    const raceData = { ...defaultRaceData, ...overrides };
    const race = new Race(raceData);
    await race.save();
    return race;
};

/**
 * Create a test rabbit
 * @param {Object} overrides - Properties to override default rabbit data
 * @returns {Object} Created rabbit
 */
const createTestRabbit = async (overrides = {}) => {
    // Create a test race first if not provided
    let race = overrides.race;
    if (!race) {
        const testRace = await createTestRace();
        race = testRace.name;
    }

    const defaultRabbitData = {
        race: race,
        code: 'T001',
        sex: 'macho',
        age: 6,
        weight: 3.5,
        purpose: 'Engorde'
    };

    const rabbitData = { ...defaultRabbitData, ...overrides };
    const rabbit = new Rabbit(rabbitData);
    await rabbit.save();
    return rabbit;
};

/**
 * Create a test cage
 * @param {Object} overrides - Properties to override default cage data
 * @returns {Object} Created cage
 */
const createTestCage = async (overrides = {}) => {
    const defaultCageData = {
        number: 1,
        type: 'engorde',
        capacity: 4
    };

    const cageData = { ...defaultCageData, ...overrides };
    const cage = new Cage(cageData);
    await cage.save();
    return cage;
};

/**
 * Create a test feeding record
 * @param {Object} overrides - Properties to override default feeding data
 * @returns {Object} Created feeding record
 */
const createTestFeeding = async (overrides = {}) => {
    const defaultFeedingData = {
        codigo: 'T001',
        heno: 100,
        hierba: 80,
        balanceado: 120,
        fecha: new Date(),
        justificacion: 'Test feeding'
    };

    const feedingData = { ...defaultFeedingData, ...overrides };
    const feeding = new Feeding(feedingData);
    await feeding.save();
    return feeding;
};

/**
 * Create a test vaccination record
 * @param {Object} overrides - Properties to override default vaccination data
 * @returns {Object} Created vaccination record
 */
const createTestVaccination = async (overrides = {}) => {
    const defaultVaccinationData = {
        codigo: 'T001',
        mixomatosis: true,
        vhd: false,
        fecha: new Date()
    };

    const vaccinationData = { ...defaultVaccinationData, ...overrides };
    const vaccination = new Vaccination(vaccinationData);
    await vaccination.save();
    return vaccination;
};

/**
 * Create a test deworming record
 * @param {Object} overrides - Properties to override default deworming data
 * @returns {Object} Created deworming record
 */
const createTestDeworming = async (overrides = {}) => {
    const defaultDewormingData = {
        codigo: 'T001',
        desparasitacion: true,
        fecha: new Date()
    };

    const dewormingData = { ...defaultDewormingData, ...overrides };
    const deworming = new Deworming(dewormingData);
    await deworming.save();
    return deworming;
};

/**
 * Create a test mating record
 * @param {Object} overrides - Properties to override default mating data
 * @returns {Object} Created mating record
 */
const createTestMating = async (overrides = {}) => {
    const defaultMatingData = {
        rabbitCode: 'T001',
        cageNumber: 1,
        matingDate: new Date(),
        birthDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'activo'
    };

    const matingData = { ...defaultMatingData, ...overrides };
    const mating = new Mating(matingData);
    await mating.save();
    return mating;
};

/**
 * Create a test rabbit assignment
 * @param {Object} overrides - Properties to override default assignment data
 * @returns {Object} Created assignment record
 */
const createTestAssignment = async (overrides = {}) => {
    const defaultAssignmentData = {
        cageNumber: 1,
        rabbitCode: 'T001',
        status: 'asignado'
    };

    const assignmentData = { ...defaultAssignmentData, ...overrides };
    const assignment = new AssignRabbit(assignmentData);
    await assignment.save();
    return assignment;
};

/**
 * Generate a JWT token for testing
 * @param {Object} user - User object or user ID
 * @returns {String} JWT token
 */
const generateTestToken = (user) => {
    const userId = user._id || user.id || user;
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

/**
 * Create mock request object
 * @param {Object} options - Request options
 * @returns {Object} Mock request object
 */
const createMockRequest = (options = {}) => {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ip: '127.0.0.1',
        ...options
    };
};

/**
 * Create mock response object
 * @returns {Object} Mock response object with Jest spies
 */
const createMockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
};

/**
 * Create mock next function
 * @returns {Function} Mock next function
 */
const createMockNext = () => jest.fn();

/**
 * Clean up all test data from database
 */
const cleanupDatabase = async () => {
    const collections = [
        User, Rabbit, Race, Cage, Feeding, 
        Vaccination, Deworming, Mating, AssignRabbit
    ];

    for (const Model of collections) {
        await Model.deleteMany({});
    }
};

/**
 * Wait for a specific amount of time (for testing async operations)
 * @param {number} ms - Milliseconds to wait
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    createTestUser,
    createTestAdmin,
    createTestRace,
    createTestRabbit,
    createTestCage,
    createTestFeeding,
    createTestVaccination,
    createTestDeworming,
    createTestMating,
    createTestAssignment,
    generateTestToken,
    createMockRequest,
    createMockResponse,
    createMockNext,
    cleanupDatabase,
    wait
};
