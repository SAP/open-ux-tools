const config = require('../../jest.base');
config.collectCoverageFrom.push('!src/**/index.ts', 'tools/update.ts', '!tools/run-update.ts'); // ignoring index and update vocabulary file, index has only export statements and update is used to update the vocabularies (utility for updating not a deliverable code)
// prettier@3 uses dynamic import() internally which requires --experimental-vm-modules in Jest CJS mode.
// The only test that uses update.ts (debug-update-vocabularies.test.ts) is fully skipped,
// so stub prettier to prevent the module load error.
config.moduleNameMapper = { ...config.moduleNameMapper, '^prettier$': '<rootDir>/__mocks__/prettier.js' };
module.exports = config;
