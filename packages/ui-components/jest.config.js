const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.setupFilesAfterEnv = ['<rootDir>/test/test-setup.js', '<rootDir>/test/test-shim.js'];
config.snapshotResolver = '<rootDir>/test/utils/snapshotResolver.js';
config.transform = {
    '^.+\\.tsx?$': 'ts-jest',
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
config.globals = {
    'ts-jest': {
        tsconfig: 'test/tsconfig.json'
    }
};
module.exports = config;