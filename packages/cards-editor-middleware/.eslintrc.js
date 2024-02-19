module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname
    },
    globals: {
        sap: true,
        fetch: true
    }
};
