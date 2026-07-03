import base from '../../eslint.config.mjs';

export default [
    ...base,
    {
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
    }
];
