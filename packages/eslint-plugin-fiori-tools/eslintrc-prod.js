'use strict';

module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': ['**/*.*'],
            'excludedFiles': [
                'test/**',
                'target/**',
                'webapp/test/**',
                'webapp/localservice/**',
                'backup/**',
                'Gruntfile.js',
                'changes_preview.js',
                'gulpfile.js'
            ],
            'extends': ['eslint:recommended', 'plugin:fiori-custom/fioriToolsDefault']
        }
    ]
};
