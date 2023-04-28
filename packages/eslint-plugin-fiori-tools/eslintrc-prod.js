'use strict';

module.exports = {
    overrides: [
        {
            'plugins': ['fiori-custom'],
            'files': ['**/*.js', '**/*.ts'],
            'excludedFiles': [
                'test/**',
                'target/**',
                'webapp/test/**',
                'webapp/localservice/**',
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
