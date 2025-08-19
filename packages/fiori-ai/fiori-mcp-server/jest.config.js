module.exports = {
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig-test.json' }],
        '^.+\\.txt$': 'jest-text-transformer'
    },
    testMatch: ['**/unit/**/?(*.)+(test).ts'],
    modulePathIgnorePatterns: ['<rootDir>/test/data/'],
    testResultsProcessor: 'jest-sonar-reporter',
    collectCoverage: true,
    snapshotFormat: {
        escapeString: true,
        printBasicPrototype: true
    },
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
    coverageDirectory: 'reports/test/unit/coverage',
    reporters: [
        'default',
        'summary',
        ['jest-junit', { outputDirectory: 'reports/test/unit', outputName: 'junit-report.xml' }]
    ]
};
