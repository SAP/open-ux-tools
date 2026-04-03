import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.setupFilesAfterEnv = ['<rootDir>/test/test-shim.js'];
config.transform = {
    '^.+\\.tsx?$': [
        'ts-jest',
        {
            tsconfig: 'test/tsconfig.json'
        }
    ],
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
export default config;
