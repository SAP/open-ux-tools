module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts'],
    globals: {
        'ts-jest': {
            tsconfig: './test/tsconfig.json'
        }
    },
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
    modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/test/abap/mockResponses/'],
    verbose: true
};
