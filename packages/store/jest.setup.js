// jest.setup.js
jest.mock('@zowe/secrets-for-zowe-sdk', () => ({
    keyring: {
        setPassword: jest.fn(),
        getPassword: jest.fn(),
        deletePassword: jest.fn(),
        findCredentials: jest.fn(),
    }
}));
