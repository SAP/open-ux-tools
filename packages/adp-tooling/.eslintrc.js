module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        // ui5 modules are not available in file system
        'import/no-unresolved': ['error', { ignore: ['^sap/'] }],
        '@typescript-eslint/no-use-before-define': 'warn',
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/no-this-alias': 'warn',
        'consistent-this': 'warn', // that - this
        'space-before-function-paren': 'off',
        'jsdoc/match-description': 'off',
        'radix': 'off'
    }
};
