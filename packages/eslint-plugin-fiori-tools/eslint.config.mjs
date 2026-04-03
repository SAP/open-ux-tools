import base from '../../eslint.config.mjs';
const { default: eslintPlugin } = require('eslint-plugin-eslint-plugin');

import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    {
        ignores: ['config/**/eslintrc*.js']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        }
    },
    eslintPlugin.configs.recommended
];
