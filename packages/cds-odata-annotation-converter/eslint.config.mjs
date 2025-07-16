import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: ['dist', 'out', 'reports', 'test/**/*.js']
    },
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                'EXPERIMENTAL_useSourceOfProjectReferenceRedirect': true,
                project: './tsconfig.eslint.json',
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
            }
        },
        rules: {
            '@typescript-eslint/no-use-before-define': 'off'
        }
    }
];
