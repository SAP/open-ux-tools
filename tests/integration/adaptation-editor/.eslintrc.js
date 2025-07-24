module.exports = {
    extends: ['../../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        'no-console': 'off'
    }
};
