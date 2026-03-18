// Set SYSTEMDRIVE for @azure/monitor-opentelemetry-exporter which requires it at static init time
// even on non-Windows systems (applicationinsights v3 transitive dependency)
if (!process.env.SYSTEMDRIVE) {
    process.env.SYSTEMDRIVE = process.platform === 'win32' ? 'C:' : '/';
}

module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    setupFiles: ['<rootDir>/../../jest.setup.js'],
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
        '<rootDir>/test/test-input',
        '<rootDir>/test/test-output',
        '<rootDir>/test/integration'
    ],
    verbose: true,
    snapshotFormat: {
        escapeString: true,
        printBasicPrototype: true
    }
};
