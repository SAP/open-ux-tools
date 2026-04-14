import base from '../../eslint.config.mjs';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import tseslint from 'typescript-eslint';

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsParser = tseslint.parser;

export default [
    {
        ignores: ['config/**/eslintrc*.js', 'test/global-setup.mjs']
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
