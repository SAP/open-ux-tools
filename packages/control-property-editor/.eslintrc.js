module.exports = {
    extends: ['../../.eslintrc', 'plugin:react/recommended'],
    parserOptions: {
        EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
        project: './tsconfig-test.json'
    },
    overrides: [
        {
            parser: '@typescript-eslint/parser',
            files: ['./test/**/*.tsx'],
            rules: {
                'no-loop-func': 'off'
            }
        }
    ],
    rules: {
        'no-console': 'off'
    },
    settings: {
        'react': {
            'version': 'detect'
        }
    }
};
