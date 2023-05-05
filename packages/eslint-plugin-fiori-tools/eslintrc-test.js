'use strict';
const { getWebAppPath } = require('./lib/utils');
const webappPath = getWebAppPath();
module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': [`${webappPath}/test/**/*.js`, `${webappPath}/test/**/*.ts`],
            'excludedFiles': ['*.d.ts', '**/*.d.ts'],
            'extends': ['plugin:fiori-custom/fioriToolsTestcode']
        }
    ]
};
