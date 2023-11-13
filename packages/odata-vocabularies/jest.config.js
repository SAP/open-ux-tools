const config = require('../../jest.base');
config.globals = {
    'ts-jest': {
        tsconfig: 'tsconfig-test.json'
    }
};
config.testRegex = 'test/.*\\.test\\.ts$';
config.modulePathIgnorePatterns.push('<rootDir>/test/test-output');
config.modulePathIgnorePatterns.push('<rootDir>/templates');
config.testPathIgnorePatterns = [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/src/tools/update.ts',
    '<rootDir>/src/index.ts'
];
//config.collectCoverageFrom.push('!src/**/index.ts', '!src/tools/update.ts'); // ignoring index and update vocabulary file, index has only export statements and update is used to update the vocabularies (utility for updating not a deliverable code)
config.reporters.push('summary');
module.exports = config;
