import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.setupFilesAfterEnv = ['<rootDir>/test/test-shim.js'];
config.extensionsToTreatAsEsm = ['.ts', '.tsx'];
config.transform = {
    '^.+\\.[jt]sx?$': [
        'ts-jest',
        {
            useESM: true,
            tsconfig: 'test/tsconfig.json'
        }
    ],
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(\\.pnpm|@sap-ux|@sap-ux-private|@fluentui|@griffel|tslib)/)',
    'node_modules/\\.pnpm/(?!(@sap-ux|@sap-ux-private|@fluentui\\+|@griffel\\+|tslib\\+))'
];
export default config;
