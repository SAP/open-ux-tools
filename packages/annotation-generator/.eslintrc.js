module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    overrides: [
        {
            parser: '@typescript-eslint/parser',
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
    ]
};
