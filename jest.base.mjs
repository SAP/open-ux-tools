import { resolve } from 'node:path';
const __dirname = import.meta.dirname;

export default {
    extensionsToTreatAsEsm: ['.ts'],
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
    testEnvironment: 'node',
    setupFiles: [resolve(__dirname, 'jest.setup.mjs')],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
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
    // Also transform @sap-devx/yeoman-ui-types since it ships untransformed ESM under .pnpm/
    // The (?:.*?/)? lazy prefix accounts for pnpm's .pnpm/<name>+<version>/node_modules/<name> layout
    transformIgnorePatterns: [
        'node_modules/(?!(?:.*?/)?(@sap-ux|@sap-ux-private|@sap/ux-cds-compiler-facade|@sap-devx[+/]yeoman-ui-types)/)'
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
