module.exports = {
    extends: ['../../.eslintrc', 'plugin:react/recommended'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
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
