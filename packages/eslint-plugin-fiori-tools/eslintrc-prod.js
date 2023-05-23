'use strict';
const { getWebAppPath } = require('./lib/utils');
const webappPath = getWebAppPath();
module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': [`./${webappPath}/**/*.js`, `./${webappPath}/**/*.ts`],
            'excludedFiles': [
                'test/**',
                'target/**',
                `${webappPath}/test/**`,
                `${webappPath}/localservice/**`,
                'backup/**',
                'Gruntfile.js',
                'changes_preview.js',
                'changes_preview.ts',
                'gulpfile.js',
                '*.d.ts',
                '**/*.d.ts'
            ],
            'extends': ['eslint:recommended', 'plugin:fiori-custom/fioriToolsDefault']
        }
    ]
};
