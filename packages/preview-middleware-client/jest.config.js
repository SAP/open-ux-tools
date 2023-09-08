const config = require('../../jest.base');
config.testEnvironment = 'jsdom';
config.moduleNameMapper = {
    '^sap/(.+)$': '<rootDir>/test/__mock__/sap/$1.ts',
    '^mock/(.+)$': '<rootDir>/test/__mock__/$1.ts'
};
config.transform = {
    '^.+\\.ts$': [
        'ts-jest',
        {
            tsConfig: 'tsconfig.eslint.json'
        }
    ]
};
config.setupFiles = ['<rootDir>/setup-mock.js'];
module.exports = config;
