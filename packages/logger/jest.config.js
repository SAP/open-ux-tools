module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    setupFilesAfterEnv: ['jest-extended/all'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts'],
    reporters: [
        'default',
        [
            'jest-sonar',
            {
                reportedFilePath: 'relative',
                relativeRootDir: '<rootDir>'
            }
        ]
    ],
    modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/test/test-output'],
    globals: {
        'ts-jest': {
            tsconfig: 'test/tsconfig.json'
        }
    }
};
