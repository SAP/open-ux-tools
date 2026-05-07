import base from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;

const __dirname = import.meta.dirname;

export default [
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
