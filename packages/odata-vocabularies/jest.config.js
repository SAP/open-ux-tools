const config = require('../../jest.base');
config.collectCoverageFrom.push('!src/**/index.ts', 'tools/update.ts', '!tools/run-update.ts'); // ignoring index and update vocabulary file, index has only export statements and update is used to update the vocabularies (utility for updating not a deliverable code)
module.exports = config;
