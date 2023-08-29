const config = require('../../jest.base');
config.moduleNameMapper = {
    '^sap/(.+)$': `<rootDir>/test/__mock__/sap/$1.ts`
};
config.transform = {
    '^.+\\.ts$': [
        'ts-jest',
        {
            tsConfig: 'tsconfig.jest.json'
        }
    ]
};
module.exports = config;
