import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.testEnvironment = 'jsdom';
config.extensionsToTreatAsEsm = ['.ts', '.tsx'];
config.collectCoverageFrom = ['src/**/*.{ts,tsx}'];
config.transform = {
    '^.+\\.[jt]sx?$': [
        'ts-jest',
        {
            useESM: true,
            jsx: 'react-jsx',
            tsconfig: {
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                isolatedModules: true,
                allowJs: true,
                jsx: 'react-jsx'
            },
            diagnostics: {
                warnOnly: true,
                exclude: /\.(spec|test)\.ts$/,
                ignoreCodes: [151001]
            }
        }
    ],
    '.+\\.(css|sass|scss)$': 'jest-scss-transform'
};
config.transformIgnorePatterns = [
    'node_modules/(?!(\\.pnpm|@sap-ux|@sap-ux-private|@fluentui|@reduxjs|@testing-library|@babel|react-redux|react-i18next|i18next|redux|uuid|symbol-observable|hoist-non-react-statics|react-is)/)',
    'node_modules/\\.pnpm/(?!(@sap-ux|@sap-ux-private|@fluentui|@reduxjs|@testing-library|@babel|react-redux|react-i18next|i18next|redux|uuid|symbol-observable|hoist-non-react-statics|react-is))'
];
config.moduleNameMapper = {
    ...baseConfig.moduleNameMapper,
    '^@reduxjs/toolkit$': '<rootDir>/node_modules/@reduxjs/toolkit/dist/redux-toolkit.esm.js',
    '^react-redux$': '<rootDir>/node_modules/react-redux/lib/index.js'
};
config.testMatch = ['**/test/unit/**/*.(test).ts(x)?'];
config.setupFiles = ['<rootDir>/../../jest.setup.mjs', './test/unit/setup.ts'];
export default config;
