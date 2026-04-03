import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.setupFilesAfterEnv = ['jest-extended/all', './jest.setup.js'];
config.transform = {
    '^.+\\.tsx?$': [
        'ts-jest',
        {
            tsconfig: 'test/tsconfig.json'
        }
    ]
};
export default config;
