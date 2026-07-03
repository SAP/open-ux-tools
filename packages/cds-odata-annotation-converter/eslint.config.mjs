import base from '../../eslint.config.mjs';

export default [
    ...base,
    {
        ignores: ['**/*.cjs']
    },
    {
        'rules': {
            '@typescript-eslint/no-use-before-define': ['off']
        }
    }
];
