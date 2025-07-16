import baseConfig from '../../eslint.config.mjs';
import tsParser from '@typescript-eslint/parser';
import { fileURLToPath } from 'url';
import path from 'path';

export default [
    {
        ignores: ['dist', 'out', 'reports', 'jest.setup.js', 'test/**/*.js']
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
    },
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
            }
        },
        rules: {
            'jsdoc/require-jsdoc': [
                'error',
                {
                    'publicOnly': true,
                    'require': {
                        'FunctionDeclaration': true,
                        'MethodDefinition': true,
                        'ClassDeclaration': true,
                        'ArrowFunctionExpression': true,
                        'FunctionExpression': true
                    },
                    'exemptEmptyFunctions': true
                }
            ]
        }
    }
];
