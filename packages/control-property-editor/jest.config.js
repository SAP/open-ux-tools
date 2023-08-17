module.exports = {
    displayName: 'control-property-editor',
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
    globals: {
        'ts-jest': {
            jsx: 'react',
            diagnostics: {
                warnOnly: true,
                exclude: /\.(spec|test)\.ts$/
            }
        }
    },
    notify: false,
    notifyMode: 'failure',
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testMatch: ['**/test/unit/**/*.(test).ts(x)?'],
    // testResultsProcessor: 'jest-sonar-reporter',
    transform: {
        '^.+\\.test.tsx?$': 'ts-jest',
        '.+\\.(css|sass|scss)$': 'jest-scss-transform'
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
    verbose: false,
    reporters: [
        'default',
        'summary',
        ['jest-junit', { outputDirectory: 'reports/test/unit', outputName: 'junit-report.xml' }]
    ]
};
