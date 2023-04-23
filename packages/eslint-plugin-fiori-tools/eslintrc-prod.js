'use strict';

module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': [
                '**/*.js'
                //   ,  '**/*.ts' // TODO uncomment this
            ],
            'excludedFiles': [
                'test/**',
                'target/**',
                'webapp/test/**',
                'webapp/localservice/**',
                'backup/**',
                'Gruntfile.js',
                'changes_preview.js',
                'changes_preview.ts',
                'gulpfile.js'
            ],
            'extends': ['eslint:recommended', 'plugin:fiori-custom/fioriToolsDefault']
        }
    ]
};
