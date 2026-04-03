import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.setupFilesAfterEnv = ['jest-extended/all'];
export default config;
