import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.testEnvironment = 'jsdom';
config.extensionsToTreatAsEsm = ['.ts', '.tsx'];
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.setupFilesAfterEnv = ['<rootDir>/test/test-setup.cjs', '<rootDir>/test/test-shim.cjs'];
config.snapshotResolver = '<rootDir>/test/utils/snapshotResolver.cjs';
config.transform = {
    '^.+\\.tsx?$': [
        'ts-jest',
        {
            useESM: true,
            tsconfig: 'test/tsconfig.json',
            diagnostics: {
                ignoreCodes: [151001]
            }
        }
    ],
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Redirect @fluentui/react to CJS build to avoid ESM parsing issues
    '^@fluentui/react$': '<rootDir>/node_modules/@fluentui/react/lib-commonjs/index.js',
    '^@fluentui/react/lib/(.*)$': '<rootDir>/node_modules/@fluentui/react/lib-commonjs/$1'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(@sap-ux|@sap-ux-private)/)'
];
export default config;
