const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
// Enzyme depends on cheerio via CommonJS. Force Node export conditions so Jest
// does not resolve cheerio's browser ESM build under jsdom.
config.testEnvironmentOptions = { customExportConditions: ['node', 'node-addons'] };
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.setupFilesAfterEnv = ['<rootDir>/test/test-setup.js', '<rootDir>/test/test-shim.js'];
config.snapshotResolver = '<rootDir>/test/utils/snapshotResolver.js';
config.moduleNameMapper = {
    '^cheerio/lib/utils$': 'cheerio/utils'
};
config.transform = {
    '^.+\\.tsx?$': [
        'ts-jest',
        {
            tsconfig: 'test/tsconfig.json'
        }
    ],
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
module.exports = config;
