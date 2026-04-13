import base from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    {
        ignores: ['test/json-esm-transform.mjs']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
        rules: {
            'import/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk'] }]
        }
    },
];