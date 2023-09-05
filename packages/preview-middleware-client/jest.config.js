const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.moduleNameMapper = {
    '^sap/(.+)$': `<rootDir>/test/__mock__/sap/$1.ts`
};
module.exports = config;
