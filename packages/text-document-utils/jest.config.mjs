import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.coveragePathIgnorePatterns = ['index.ts'];
export default config;
