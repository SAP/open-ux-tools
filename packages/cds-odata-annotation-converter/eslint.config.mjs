import base from '../../eslint.config.mjs';

const __dirname = import.meta.dirname;

export default [
    ...base,
    {
        ignores: ['**/*.cjs']
    },
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        },
        'rules': {
            '@typescript-eslint/no-use-before-define': ['off']
        }
    }
];
