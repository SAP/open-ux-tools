const base = require('../../eslint.config.js');

module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            }
        }
    },
    {
        'rules': {
            'quote-props': 0
        }
    }
];
