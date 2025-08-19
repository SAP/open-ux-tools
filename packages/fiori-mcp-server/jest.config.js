const config = require('../../jest.base');
module.exports = { ...config, modulePathIgnorePatterns: [...config.modulePathIgnorePatterns, '<rootDir>/test/data/'] };
