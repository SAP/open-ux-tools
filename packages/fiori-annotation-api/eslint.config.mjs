import { createConfig } from '../../eslint.config.mjs';

export default [
    {
        ignores: ['*.cjs', 'test/__cjs-proxies/**']
    },
    ...createConfig(import.meta.dirname),
    {
        files: ['src/**/*.ts'],
        ignores: ['dist', 'test/fixtures/**', 'coverage', 'node_modules/**', 'eslint.config.js'],
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
        rules: {
            'jsdoc/require-jsdoc': 'off'
        }
    }
];
