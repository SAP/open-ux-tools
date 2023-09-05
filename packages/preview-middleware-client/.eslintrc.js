module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        // ui5 modules are not available in the file system
        'import/no-unresolved': ['error', { ignore: ['^sap/'] }]
    }
};
