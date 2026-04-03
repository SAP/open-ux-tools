import base from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
