import baseConfig from '../../jest.base.mjs';
const config = { ...baseConfig };
config.testMatch = ['**/test/unit/?(*.)+(spec|test).[jt]s?(x)'];
config.collectCoverageFrom = ['src/**/*.js'];
config.collectCoverage = true;
// This package has CJS source files (.js with require/module.exports)
// Don't treat .js extensions as ESM, and exclude fixture test files
config.extensionsToTreatAsEsm = [];
config.testPathIgnorePatterns = [
    ...(config.testPathIgnorePatterns || []),
    '/test/fixtures/'
];
export default config;
