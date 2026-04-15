const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
// Enzyme depends on cheerio via CommonJS. Force Node export conditions so Jest
// does not resolve cheerio's browser ESM build under jsdom.
config.testEnvironmentOptions = { customExportConditions: ['node', 'node-addons'] };
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.setupFilesAfterEnv = ['<rootDir>/test/test-setup.js', '<rootDir>/test/test-shim.js'];
config.snapshotResolver = '<rootDir>/test/utils/snapshotResolver.js';
config.moduleNameMapper = {
    // Enzyme (3.11.0) resolves cheerio@1.0.0-rc.12 internally and requires 'cheerio/lib/utils'.
    // Jest intercepts this via moduleNameMapper and must redirect to a physical path because
    // ui-components has no direct cheerio dep (pnpm strict isolation blocks package-export resolution).
    '^cheerio/lib/utils$':
        '<rootDir>/../../node_modules/.pnpm/cheerio@1.0.0-rc.12/node_modules/cheerio/lib/utils'
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
