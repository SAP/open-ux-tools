const config = require('../../jest.base');

module.exports = {
    ...config,
    transformIgnorePatterns: ['<rootDir>/../../node_modules/(?!(mem-fs|mem-fs-editor)/)']
};
    