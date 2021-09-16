module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    coverageReporters: ['text'],
    collectCoverageFrom: ['src/**/*.ts'],
	  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/test/test-output']
};
