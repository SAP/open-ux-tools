module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        '@typescript-eslint/no-restricted-imports': [
            'error',
            {
                paths: [
                    {
                        name: '@sap-ux/axios-extension',
                        allowTypeImports: true,
                        message: "Only type imports from '@sap-ux/axios-extension' are allowed here."
                    }
                ]
            }
        ]
    }
};
