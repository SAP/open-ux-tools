'use strict';

module.exports = {
    globals: {
        MyGlobal: true
    },
    root: true,
    env: {
        'browser': true,
        'es6': true,
        'node': true
    },
    overrides: [
        {
            'plugins': ['@typescript-eslint'],
            'files': ['*.ts'],
            'parser': '@typescript-eslint/parser',
            'extends': ['plugin:@typescript-eslint/recommended'],
            'parserOptions': {
                'project': ['tsconfig.json']
            }
        },
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
        },
        {
            'plugins': ['fiori-custom'],
            'files': ['webapp/test/**'],
            'extends': ['plugin:fiori-custom/fioriToolsTestcode']
        }
    ]
};
