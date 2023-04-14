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
            'files': ['*.ts'], // Your TypeScript files extension
            // As mentioned in the comments, you should extend TypeScript plugins here,
            // instead of extending them outside the `overrides`.
            // If you don't want to extend any rules, you don't need an `extends` attribute.
            'parser': '@typescript-eslint/parser',
            'extends': [
                'plugin:@typescript-eslint/recommended'
                // "plugin:@typescript-eslint/recommended-requiring-type-checking"
            ],
            'parserOptions': {
                'sourceType': 'module',
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
