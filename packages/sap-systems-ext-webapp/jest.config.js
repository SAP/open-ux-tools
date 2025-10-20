const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.transform = {
    '^.+\\.test.tsx?$': 'ts-jest',
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
config.preset = 'ts-jest';
config.transformIgnorePatterns = ['<rootDir>/node_modules/'];
config.testMatch = ['**/test/unit/**/*.(test).ts(x)?'];
config.setupFiles = ['./test/setup.ts'];
module.exports = config;
