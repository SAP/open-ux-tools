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
        }]
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
