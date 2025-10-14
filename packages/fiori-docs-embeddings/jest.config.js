const config = require('../../jest.base.js');

module.exports = {
    ...config,
    modulePathIgnorePatterns: [...config.modulePathIgnorePatterns, '<rootDir>/test/data/', '<rootDir>/data/']
};
