const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.transform = {
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
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
module.exports = config;
