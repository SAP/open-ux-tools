module.exports = {
    displayName: 'store-webapp',
    automock: false,
    clearMocks: true,
    collectCoverage: true,
    snapshotFormat: {
        escapeString: true,
        printBasicPrototype: true
    },
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
    coverageDirectory: 'reports/test/unit/coverage',
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
    errorOnDeprecated: true,
    notify: false,
    notifyMode: 'failure',
    preset: 'ts-jest',
    setupFilesAfterEnv: ['./test/test-setup.js'],
    testEnvironment: 'jsdom',
    testMatch: ['**/test/**/*.(test).ts(x)?'],
    testResultsProcessor: 'jest-sonar-reporter',
    transform: {
        '^.+\\.test.tsx?$': ['ts-jest', {
            jsx: 'react',
            diagnostics: {
                warnOnly: true,
                exclude: /\.(spec|test)\.ts$/
            }
        }],
        '.+\\.(css|sass|scss)$': 'jest-scss-transform'
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
    verbose: false,
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0
        }
    },
    reporters: [
        'default',
        'summary',
        ['jest-junit', { outputDirectory: 'reports/test/unit', outputName: 'junit-report.xml' }]
    ]
};
