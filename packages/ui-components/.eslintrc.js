module.exports = {
    extends: ['../../.eslintrc', 'plugin:react/recommended', 'plugin:storybook/recommended'],
    parserOptions: {
        'EXPERIMENTAL_useSourceOfProjectReferenceRedirect': true,
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    overrides: [
        {
            'parser': '@typescript-eslint/parser',
            'files': ['./test/**/*.tsx'],
            'rules': {
                'no-loop-func': 'off'
            }
        },
        {
            'parser': '@typescript-eslint/parser',
            'files': ['./src/**/*.tsx'],
            'rules': {
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_', 'ignoreRestSiblings': true }
                ]
            }
        }
    ],
    rules: {
        'react/no-unknown-property': ['error', { 'ignore': ['onFocusCapture'] }],
        'jsdoc/require-param-description': 'off',
        'jsdoc/require-returns-description': 'off',
        'jsdoc/no-undefined-types': 'off'
    },
    settings: {
        'react': {
            'version': 'detect'
        }
    }
};
