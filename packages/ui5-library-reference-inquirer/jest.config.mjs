import baseConfig from '../../jest.base.mjs';
export default {
    ...baseConfig,
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^@vscode-logging/logger$': '<rootDir>/test/__mocks__/vscode-logging-logger.js',
        '^@sap-devx/yeoman-ui-types$': '<rootDir>/node_modules/@sap-devx/yeoman-ui-types/dist/cjs/src/index.js'
    }
};
