module.exports = {
    root: true,
    extends: ['plugin:@sap-ux/eslint-plugin-fiori-tools/defaultTS'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        'quotes': ['warn', 'single'],
        'valid-jsdoc': ['error', {
            requireParamType: false,
            requireReturn: false,
            requireReturnType: false
        }],
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_'
            }
        ]
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
