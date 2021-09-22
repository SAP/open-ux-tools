module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: false,
    coverageReporters: ['text','html'],
    collectCoverageFrom: ['src/**/*.ts'],
	  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/test/test-output']
};
