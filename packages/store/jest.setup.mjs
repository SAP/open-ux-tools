import { jest } from '@jest/globals';

// Mocking the '@zowe/secrets-for-zowe-sdk' module to simulate keyring functionality.
jest.unstable_mockModule('@zowe/secrets-for-zowe-sdk', () => ({
    keyring: {
        setPassword: jest.fn(),
        getPassword: jest.fn(),
        deletePassword: jest.fn(),
        findCredentials: jest.fn()
    }
}));
