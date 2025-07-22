import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: ['test/test-output/', 'dist']
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
            '@typescript-eslint/naming-convention': [
                'off',
                {
                    selector: 'variable',
                    format: ['UPPER_CASE', 'snake_case']
                }
            ]
        }
    },
    {
        files: ['src/parser/parser.ts'],
        rules: {
            'new-cap': [
                'warn',
                {
                    capIsNew: false
                }
            ]
        }
    },
    {
        files: ['src/parser/tokens.ts'],
        rules: {
            camelcase: [
                'warn',
                {
                    properties: 'never'
                }
            ]
        }
    }
];
