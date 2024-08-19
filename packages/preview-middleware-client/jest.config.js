const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.moduleNameMapper = {
    '^sap/(.+)$': '<rootDir>/test/__mock__/sap/$1.ts',
    '^mock/(.+)$': '<rootDir>/test/__mock__/$1.ts',
    '^open/ux/preview/client/(.+)$': '<rootDir>/src/$1.ts'
};
config.transform = {
    '^.+\\.ts$': [
        'ts-jest',
        {
            tsConfig: 'tsconfig.eslint.json'
        }
    ]
};
module.exports = config;
