'use strict';
const { getResourcePaths } = require('./lib/utils');
const { sourceCodePath, testCodePath } = getResourcePaths();
const overrides = [
    {
        'plugins': ['fiori-custom'],
        'files': [`./${sourceCodePath}/**/*.js`, `./${sourceCodePath}/**/*.ts`],
        'excludedFiles': [
            'target/**',
            `${sourceCodePath}/test/**`,
            `${sourceCodePath}/localservice/**`,
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
];

if (!testCodePath) {
    overrides[0].excludedFiles.push('test/**');
}
module.exports = {
    overrides
};
