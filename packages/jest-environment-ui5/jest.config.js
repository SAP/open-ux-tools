const config = require('../../jest.base');
config.testMatch = ['**/test/unit/?(*.)+(spec|test).[jt]s?(x)'];
config.collectCoverageFrom = ['src/**/*.js'];
config.collectCoverage = true;
// Transform only mem-fs and mem-fs-editor from node_modules, ignore everything else (including @ui5)
// This allows @ui5 ESM modules to be loaded natively by Node when using --experimental-vm-modules
config.transformIgnorePatterns = [
    '<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)'
];
// Don't transform .js files - let Node handle them natively with --experimental-vm-modules
// This preserves dynamic imports which are needed for ESM interop with @ui5/project
config.transform = {
    '^.+\\.ts$': 'ts-jest'
    // Remove ts-jest transformation for .js files to preserve dynamic imports
};
module.exports = config;
