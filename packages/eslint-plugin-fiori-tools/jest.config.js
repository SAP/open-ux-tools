const config = require('../../jest.base');
module.exports = {
    ...config,
    coverageProvider: 'v8',
    setupFiles: ['<rootDir>/test/global-setup.ts']
}
