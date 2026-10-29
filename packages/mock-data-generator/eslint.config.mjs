import base from '../../eslint.config.mjs';

export default [
    ...base,
    {
        files: ['src/**/*.{cts,ts}'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            'consistent-return': 'error',
            'default-case': 'error'
        }
    },
    {
        files: ['src/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'error'
        }
    }
];
