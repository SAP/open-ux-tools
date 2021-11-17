module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    coverageDirectory: 'reports/test/unit/coverage',
    testResultsProcessor: 'jest-sonar-reporter',
    collectCoverageFrom: ['src/**/*.ts'],
    modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/test/test-output']
};
