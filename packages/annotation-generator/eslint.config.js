const base = require('../../eslint.config.js');
module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser',
                tsconfigRootDir: __dirname,
                projectService: true
            }
        },
        files: ['src/**/*.ts'],
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
