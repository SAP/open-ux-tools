const base = require('../../eslint.config.js');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    ...base,
    {
        // Re-enable linting for scripts folder (overriding base ignore)
        ignores: ['!scripts/**']
    },
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        },
        rules: {
            'no-console': 'off'
        }
    }
];
