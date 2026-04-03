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
                project: './tsconfig.eslint.json',
            },
        },
        rules: {
        'jsdoc/require-returns': 'off',
        'jsdoc/require-param': 'off',
        'jsdoc/require-jsdoc': 'off',
        'jsdoc/match-description': 'off',
        'jsdoc/multiline-blocks': 'off',
        'jsdoc/tag-lines': 'off',
        'jsdoc/require-param-description': 'off',
        'jsdoc/no-multi-asterisks': 'off',
        'jsdoc/check-tag-names': 0
    }
    },
];