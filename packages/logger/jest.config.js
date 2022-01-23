module.exports = {
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    setupFilesAfterEnv: ['jest-extended/all'],
    coverageReporters: ['text', 'html'],
    collectCoverageFrom: ['src/**/*.ts'],
    globals: {
        'ts-jest': {
            tsconfig: 'test/tsconfig.json'
        }
    }
};
