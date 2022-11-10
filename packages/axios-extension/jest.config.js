const config = require('../../jest.base');
config.modulePathIgnorePatterns.push('<rootDir>/test/abap/mockResponses/');
config.globals = {
    'ts-jest': {
        tsconfig: './tsconfig.json'
    }
};
module.exports = config;