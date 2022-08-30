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
    coverageReporters: ['text', ['lcov', { projectRoot: '../../' }]],
    modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/coverage'],
    verbose: true
};
