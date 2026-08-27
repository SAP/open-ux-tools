import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.extensionsToTreatAsEsm = ['.ts', '.tsx'];
config.testEnvironment = 'jsdom';
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.transform = {
    '^.+\\.[jt]sx?$': [
        'ts-jest',
        {
            useESM: true,
            tsconfig: {
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                isolatedModules: true,
                allowJs: true,
                jsx: 'react-jsx'
            },
            diagnostics: {
                ignoreCodes: [151001]
            }
        }
    ],
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
config.transformIgnorePatterns = ['<rootDir>/node_modules/(?!(@sap-ux|@sap-ux-private|@reduxjs|react-redux|redux|i18next|react-i18next)/)'];
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '^@reduxjs/toolkit$': '<rootDir>/node_modules/@reduxjs/toolkit/dist/redux-toolkit.esm.js'
};
config.testMatch = ['**/test/unit/**/*.(test).ts(x)?'];
config.setupFiles = ['<rootDir>/../../jest.setup.mjs', './test/setup.ts'];
export default config;
