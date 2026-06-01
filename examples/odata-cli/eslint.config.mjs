import base from '../../eslint.config.mjs';
const __dirname = import.meta.dirname;

export default [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            }
        }
    },
    {
        rules: {
            'no-console': 'off'
        }
    }
];
