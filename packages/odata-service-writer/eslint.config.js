const base = require('../../eslint.config.js');
const tseslint = require('typescript-eslint');
const tsParser = tseslint.parser;

module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        },
        rules: {
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@sap-ux/axios-extension',
                            allowTypeImports: true,
                            message: "Only type imports from '@sap-ux/axios-extension' are allowed here."
                        }
                    ]
                }
            ]
        }
    }
];
