import base from '../../eslint.config.mjs';

const __dirname = import.meta.dirname;

export default [
    {
        ignores: ['test/jest.setup.mjs']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        }
    }
];
