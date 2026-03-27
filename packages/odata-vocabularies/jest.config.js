const config = require('../../jest.base');
config.collectCoverageFrom.push('!src/**/index.ts', 'tools/update.ts', '!tools/run-update.ts'); // ignoring index and update vocabulary file, index has only export statements and update is used to update the vocabularies (utility for updating not a deliverable code)
// prettier@3 uses dynamic import() internally which requires --experimental-vm-modules in Jest CJS mode.
// debug-update-vocabularies.test.ts is intentionally kept skipped (it's a debug-only helper, not a
// regular test — see the comment in that file). Stub prettier to prevent the module load error at
// import time so all other tests in this package can run normally.
config.moduleNameMapper = { ...config.moduleNameMapper, '^prettier$': '<rootDir>/__mocks__/prettier.js' };
module.exports = config;
