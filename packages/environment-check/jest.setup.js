// jest.setup.js

// Mocking the '@zowe/secrets-for-zowe-sdk' module to simulate keyring functionality
// This ensures that tests for the KeyStoreManager class which utilizes '@zowe/secrets-for-zowe-sdk'
// does not have any side effects while testing. 
jest.mock('@zowe/secrets-for-zowe-sdk', () => ({
    keyring: {
        setPassword: jest.fn(),
        getPassword: jest.fn(),
        deletePassword: jest.fn(),
        findCredentials: jest.fn(),
    }
}));