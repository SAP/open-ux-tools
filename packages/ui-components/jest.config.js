module.exports = {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '.+\\.(css|sass|scss)$': 'jest-scss-transform'
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
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
        '<rootDir>/test/test-output',
        '<rootDir>/templates',
        '<rootDir>/coverage'
    ],
    setupFilesAfterEnv: ['<rootDir>/test/test-setup.js', '<rootDir>/test/test-shim.js'],
    snapshotResolver: '<rootDir>/test/utils/snapshotResolver.js'
};
