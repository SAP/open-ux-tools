const config = require('../../jest.base');
module.exports = {
    ...config,
    setupFiles: ['<rootDir>/test/global-setup.ts']
}
