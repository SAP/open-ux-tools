// jest.setup.js

// Mocking the '@zowe/secrets-for-zowe-sdk' module to simulate keyring functionality.
// This mock ensures that tests for the KeyStoreManager class in @sap-ux/store or any other components
// using '@zowe/secrets-for-zowe-sdk' are being mocked.
// This approach prevents side effects and allows controlled testing environments.

// Using jest.mock to replace the implementation of '@zowe/secrets-for-zowe-sdk'.
jest.mock('@zowe/secrets-for-zowe-sdk', () => ({
    keyring: {
        setPassword: jest.fn(),
        getPassword: jest.fn(),
        deletePassword: jest.fn(),
        findCredentials: jest.fn()
    }
}));
