module.exports = {
    env: {
        es2024: true,
        jest: true,
        browser: true
    },
    globals: {
        sap: 'readonly'
    },
    'parserOptions': {
        'ecmaVersion': 'latest',
        'sourceType': 'module',
        'ecmaFeatures': {
            'jsx': true
        }
    },
    extends: ['../../.eslintrc'],
    ignorePatterns: 'src/shim/**/*.js'
};
