import base from '../../eslint.config.mjs';

const __dirname = import.meta.dirname;

export default [
    {
        ignores: ['**/*.cjs']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
    },
];