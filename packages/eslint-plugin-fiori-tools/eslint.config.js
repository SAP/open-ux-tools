import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname
});

const base = compat.extends('../../.eslintrc');

export default [
    { ignores: ['**/dist', '**/lib', './eslint.config.js'] },
    ...base,
    {
        files: ['**/*.ts', , '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname
            }
        }
    }
];
