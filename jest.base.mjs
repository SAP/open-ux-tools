export default {
    extensionsToTreatAsEsm: ['.ts'],
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/../../jest.setup.mjs'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        // TODO: Replace with proper ESM mock or request upstream to add ESM exports
        // This deep import path is fragile and may break if the package reorganizes internals
        '^@sap-devx/yeoman-ui-types$': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js'
    },
    moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
    transform: {
        '^.+\\.[jt]s$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    module: 'NodeNext',
                    moduleResolution: 'NodeNext',
                    isolatedModules: true,
                    allowJs: true
                },
                diagnostics: {
                    ignoreCodes: [151001]
                }
            }
        ]
    },
    // Allow jest.mock() to work with workspace packages in ESM mode
    // Also transform @sap/ux-cds-compiler-facade since it imports ESM workspace packages
    transformIgnorePatterns: [
        'node_modules/(?!(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade)/)'
    ],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts'],
    coverageReporters: ['text', ['lcov', { projectRoot: '../../' }]],
    reporters: [
        'default',
        [
            'jest-sonar',
            {
                reportedFilePath: 'relative',
                relativeRootDir: '<rootDir>/../../../'
            }
        ]
    ],
    modulePathIgnorePatterns: [
        '<rootDir>/dist',
        '<rootDir>/coverage',
        '<rootDir>/templates',
        '<rootDir>/test/test-input',
        '<rootDir>/test/test-output',
        '<rootDir>/test/integration'
    ],
    verbose: true,
    snapshotFormat: {
        escapeString: true,
        printBasicPrototype: true
    }
};
