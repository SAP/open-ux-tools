import base from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    {
        ignores: ['*.cjs', 'test/__cjs-proxies/**']
    },
    ...base,
    {
        files: ['src/**/*.ts'],
        ignores: ['dist', 'test/fixtures/**', 'coverage', 'node_modules/**', 'eslint.config.js'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
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
    },
    {
        files: ['test/**/*.ts'],
        ignores: ['dist', 'test/fixtures/**', 'coverage', 'node_modules/**', 'eslint.config.js'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        },
        rules: {
            'jsdoc/require-jsdoc': 'off'
        }
    }
];
