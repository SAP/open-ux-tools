module.exports = {
    root: true,
    extends: ['plugin:@sap-ux/eslint-plugin-fiori-tools/defaultTS'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        'quotes': ['error', 'single'],
        'valid-jsdoc': ['error', {
            requireParamType: false,
            requireReturn: false,
            requireReturnType: false
        }]/*,
        '@typescript-eslint/no-use-before-define': 'warn',
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/no-this-alias': 'warn',
        'consistent-this': 'warn', // that - this
        'space-before-function-paren': 'off',
        'jsdoc/match-description': 'off',
        'radix': 'off'*/
    },
    overrides: [
        {
            files: ['types/*.*'],
            rules: {
                '@typescript-eslint/no-namespace': 'off',
                'jsdoc/require-jsdoc': 'off'
            }
        }
    ]
};
