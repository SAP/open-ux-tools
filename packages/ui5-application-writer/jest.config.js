module.exports = {
    roots: ['<rootDir>/src', '<rootDir>/test'],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    coverageReporters: ['text','html'],
    collectCoverageFrom: ['src/**/*.ts'],
	  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/test/test-output']
};
