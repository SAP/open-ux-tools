import baseConfig from '../../jest.base.mjs';

const config = { ...baseConfig };

// Remove setup files - they're ESM and cause issues
config.setupFiles = [];

// Use CommonJS preset since the extension is built as CJS
config.preset = 'ts-jest';
config.testEnvironment = 'node';
config.transform = {
    '^.+\\.ts$': ['ts-jest', {
        tsconfig: {
            module: 'CommonJS',
            moduleResolution: 'node'
        }
    }]
};

// Don't transform node_modules - let manual mocks handle @sap-ux packages
config.transformIgnorePatterns = [
    'node_modules/'
];

// Map ESM workspace packages to manual mocks
config.moduleNameMapper = {
    '^@sap-ux/axios-extension$': '<rootDir>/test/__mocks__/@sap-ux/axios-extension.ts',
    '^@sap-ux/store$': '<rootDir>/test/__mocks__/@sap-ux/store.ts',
    '^@sap-ux/logger$': '<rootDir>/test/__mocks__/@sap-ux/logger.ts',
    '^@sap-ux/telemetry$': '<rootDir>/test/__mocks__/@sap-ux/telemetry.ts',
    '^@sap-ux/feature-toggle$': '<rootDir>/test/__mocks__/@sap-ux/feature-toggle.ts',
    '^@sap-ux/guided-answers-helper$': '<rootDir>/test/__mocks__/@sap-ux/guided-answers-helper.ts',
    '^@sap-ux/ui-components$': '<rootDir>/test/__mocks__/@sap-ux/ui-components.ts',
    '^@sap-ux/sap-systems-ext-types$': '<rootDir>/test/__mocks__/@sap-ux/sap-systems-ext-types.ts',
    '^@sap-ux/sap-systems-ext-webapp$': '<rootDir>/test/__mocks__/@sap-ux/sap-systems-ext-webapp.ts'
};

export default config;
