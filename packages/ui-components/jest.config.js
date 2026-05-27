const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
// Enzyme depends on cheerio via CommonJS. Force Node export conditions so Jest
// does not resolve cheerio's browser ESM build under jsdom.
config.testEnvironmentOptions = { customExportConditions: ['node', 'node-addons'] };
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.setupFilesAfterEnv = ['<rootDir>/test/test-setup.js', '<rootDir>/test/test-shim.js'];
config.snapshotResolver = '<rootDir>/test/utils/snapshotResolver.js';
config.moduleNameMapper = {
    // Enzyme (3.11.0) resolves cheerio internally and requires 'cheerio/lib/utils'.
    // cheerio@1.2.0+ moved utils to dist/commonjs/utils. Map the old path to the new location.
    '^cheerio/lib/utils$':
        '<rootDir>/../../node_modules/.pnpm/cheerio@1.2.0/node_modules/cheerio/dist/commonjs/utils'
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
