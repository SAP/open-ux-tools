module.exports = {
    name: 'ui-components',
    displayName: 'ui-components',
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    automock: false,
    errorOnDeprecated: true,
    notify: false,
    notifyMode: 'failure',
    verbose: false,
    testMatch: ['**/?(*.)+(test).ts?(x)'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '.+\\.(css|sass|scss)$': 'jest-scss-transform'
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
    globals: {
        'ts-jest': {
            diagnostics: {
                // warnOnly: true,
                exclude: /\.(spec|test)\.ts$/
            }
        }
    },

    setupFilesAfterEnv: ['<rootDir>/test/test-setup.js', '<rootDir>/test/test-shim.js'],
    snapshotResolver: '<rootDir>/test/utils/snapshotResolver.js'
};
