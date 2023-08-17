module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        'import/no-unresolved': 'off' // the rule has issues with UI5 imports
    }
};
