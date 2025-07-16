import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: ['dist']
    },
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
            }
        },
        rules: {
            '@typescript-eslint/no-namespace': 'off',
            'space-before-function-paren': [
                'error',
                {
                    'anonymous': 'always',
                    'named': 'never',
                    'asyncArrow': 'always'
                }
            ]
        }
    }
];
