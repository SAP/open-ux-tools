module.exports = {
    root: true,
    extends: ['plugin:@sap-ux/eslint-plugin-fiori-tools/defaultTS'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
        'valid-jsdoc': [
            'error',
            {
                requireParamType: false,
                requireReturn: false,
                requireReturnType: false
            }
        ],
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_'
            }
        ],
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn'
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
