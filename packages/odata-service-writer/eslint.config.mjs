import { createConfig } from '../../eslint.config.mjs';

export default [
    ...createConfig(import.meta.dirname),
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
