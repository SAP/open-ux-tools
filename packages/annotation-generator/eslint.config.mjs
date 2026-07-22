import base from '../../eslint.config.mjs';

export default [
    {
        ignores: ['jest.resolver.cjs', 'test/__cjs-proxies/**']
    },
    ...base,
    {
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
