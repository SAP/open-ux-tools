const config = require('../../jest.base');
module.exports = { ...config, collectCoverageFrom: ['src/**/*.ts', '!src/matchers/toMatchFileSnapshot/index.ts'] };
