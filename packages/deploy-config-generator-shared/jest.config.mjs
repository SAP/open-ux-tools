import baseConfig from '../../jest.base.mjs';

const config = { ...baseConfig };

// Map @sap-devx/yeoman-ui-types CJS module for ESM compatibility
config.moduleNameMapper = {
    ...config.moduleNameMapper,
    '@sap-devx/yeoman-ui-types': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js'
};

export default config;
