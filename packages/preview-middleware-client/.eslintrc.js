module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        // ui5 modules are not available in the file system
        'import/no-unresolved': ['error', { ignore: ['^sap/'] }],
        'space-before-function-paren': 'off',
        '@typescript-eslint/ban-ts-comment': 'warn' /* just temp */
    },
    overrides: [
        {
            files: ['types/*.*'],
            rules: {
                '@typescript-eslint/no-namespace': 'off',
                'jsdoc/require-jsdoc': 'off'
            }
        }
    ]
};
