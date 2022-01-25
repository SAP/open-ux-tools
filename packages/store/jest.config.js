module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    coverageReporters: ['text', 'html'],
    collectCoverageFrom: ['src/**/*.ts'],
    setupFilesAfterEnv: ['jest-extended'],
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
    ]
};
