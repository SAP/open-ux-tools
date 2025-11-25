'use strict';
const { getResourcePaths } = require('./lib/utils');
const { sourceCodePath, testCodePath } = getResourcePaths();
module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': [
                testCodePath ? `${testCodePath}/**/*.js` : `${sourceCodePath}/test/**/*.js`,
                testCodePath ? `${testCodePath}/**/*.js` : `${sourceCodePath}/test/**/*.ts`
            ],
            'excludedFiles': ['*.d.ts', '**/*.d.ts'],
            'extends': ['plugin:fiori-custom/fioriToolsTestcode']
        }
    ]
};
