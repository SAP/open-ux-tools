module.exports = {
    extends: ['../../.eslintrc', 'plugin:react/recommended'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        // switched off temporarily until logger for webapps
        'no-console': 'off'
    },
    settings: {
        'react': {
            'version': 'detect'
        }
    }
};
