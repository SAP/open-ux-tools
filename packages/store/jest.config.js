const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all', '<rootDir>/jest.setup.js'];
config.transform = {
    '^.+\\.tsx?$': [
        'ts-jest',
        {
            tsconfig: 'test/tsconfig.json'
        }
    ]
};
module.exports = config;
