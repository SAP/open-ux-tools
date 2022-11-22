const config = require('../../jest.base');
config.setupFilesAfterEnv = ['jest-extended/all'];
config.globals = {
    'ts-jest': {
        tsconfig: 'test/tsconfig.json'
    }
};
module.exports = config;
