module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts'],
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
    coverageReporters: [['lcov', { projectRoot: '../../' }]],
    modulePathIgnorePatterns: [
        '<rootDir>/dist',
        '<rootDir>/test/test-output',
        '<rootDir>/templates',
        '<rootDir>/coverage'
    ],
    verbose: true
};
