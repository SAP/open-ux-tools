import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: ['dist', 'templates']
    },
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
            }
        }
    }
];
