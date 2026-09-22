import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^(\\.{1,2}/.*)\\.cjs$': '$1.cts'
    },
    transform: {
        ...baseConfig.transform,
        '^.+\\.cts$': [
            'ts-jest',
            {
                useESM: false,
                tsconfig: {
                    module: 'Node16',
                    moduleResolution: 'Node16',
                    isolatedModules: true
                }
            }
        ]
    }
};
