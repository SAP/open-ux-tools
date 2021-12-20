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
    }
};
