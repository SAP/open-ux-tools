import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.setupFilesAfterEnv = ['jest-extended/all', './jest.setup.mjs'];
config.transform = {
    '^.+\\.tsx?$': [
        'ts-jest',
        {
            useESM: true,
            tsconfig: 'test/tsconfig.json'
        }
    ]
};
export default config;
