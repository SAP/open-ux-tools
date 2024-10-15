const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.transform = {
    '^.+\\.test.tsx?$': 'ts-jest',
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
config.globals = {
    'ts-jest': {
        jsx: 'react',
        diagnostics: {
            warnOnly: true,
            exclude: /\.(spec|test)\.ts$/
        }
    }
};
config.preset = 'ts-jest';
config.transformIgnorePatterns = ['<rootDir>/node_modules/'];
config.testMatch = ['**/test/unit/**/*.(test).ts(x)?'];
config.setupFiles = ['./test/unit/setup.ts'];
module.exports = config;
