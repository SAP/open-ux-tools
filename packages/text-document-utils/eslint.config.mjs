import base from '../../eslint.config.mjs';

const __dirname = import.meta.dirname;

export default [
    ...base,
    {
        ignores: ['dist-cjs/**'],
    },
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
    },
];