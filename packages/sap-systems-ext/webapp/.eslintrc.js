module.exports = {
    extends: ['../../../.eslintrc', 'plugin:react/recommended'],
    parserOptions: {
        EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
        project: './tsconfig-test.json'
    }
};
