import baseConfig from '../../jest.base.mjs';

const config = {
    ...baseConfig,
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@sap-devx/yeoman-ui-types$': '<rootDir>/test/__mocks__/@sap-devx/yeoman-ui-types.ts'
    }
};

export default config;
