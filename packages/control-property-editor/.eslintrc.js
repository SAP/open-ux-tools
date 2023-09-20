module.exports = {
    extends: ['../../.eslintrc', 'plugin:react/recommended'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        // switched off until we decide logger for webapps
        'no-console': 'off'
    },
    settings: {
        'react': {
            'version': 'detect'
        }
    }
};
