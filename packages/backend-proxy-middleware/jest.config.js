const config = require('../../jest.base');
config.coverageReporters = [
    'text', 
    ['lcov', { projectRoot: '../../' }]
];    
module.exports = config;