module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
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
        '<rootDir>/test/dist',
        '<rootDir>/test/test-input',
        '<rootDir>/test/test-output',
        '<rootDir>/test/integration'
    ],
    testPathIgnorePatterns: ['<rootDir>/test/dist', '<rootDir>/test/.*/dist'],
    verbose: true,
    snapshotFormat: {
        escapeString: true,
        printBasicPrototype: true
    }
};
