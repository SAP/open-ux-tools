import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
};
