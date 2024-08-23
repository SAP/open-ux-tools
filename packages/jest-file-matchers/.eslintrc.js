module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        'EXPERIMENTAL_useSourceOfProjectReferenceRedirect': true,
        project: './tsconfig.eslint.json'
    },
    rules: {
        '@typescript-eslint/no-namespace': 'off'
    }
};
