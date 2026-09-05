import base from '../../eslint.config.mjs';

export default [
    ...base,
    {
        files: ['src/**/*.{cts,ts}'],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'error'
        }
    }
];
