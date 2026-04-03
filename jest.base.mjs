export default {
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
    testEnvironment: 'node',
    globals: {
        'ts-jest': {
            useESM: true
        }
    },
    setupFiles: ['<rootDir>/../../jest.setup.mjs'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    module: 'NodeNext',
                    moduleResolution: 'NodeNext',
                    isolatedModules: true
                },
                diagnostics: {
                    ignoreCodes: [151001]
                }
            }
        ]
    },
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
