const base = require('../../eslint.config.js');
const tseslint = require('typescript-eslint');
const tsParser = tseslint.parser;

module.exports = [
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
