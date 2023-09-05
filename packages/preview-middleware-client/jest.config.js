const config = require('../../jest.base');
config.moduleNameMapper = {
    '^sap/(.+)$': `<rootDir>/test/__mock__/sap/$1.ts`
};
module.exports = config;
