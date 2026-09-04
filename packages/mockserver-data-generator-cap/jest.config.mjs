import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    extensionsToTreatAsEsm: [],
    transform: {
        '^.+\\.[jt]s$': [
            'ts-jest',
            {
                useESM: false,
                tsconfig: {
                    module: 'Node16',
                    moduleResolution: 'Node16',
                    isolatedModules: true,
                    allowJs: true
                }
            }
        ]
    }
};
