module.exports = {
    extends: ['../../.eslintrc'],
    parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
    },
    rules: {
        'jsdoc/require-returns': 0,
        'jsdoc/require-param': 0,
        'jsdoc/require-jsdoc': 0,
        'jsdoc/match-description': 0,
        'jsdoc/multiline-blocks': 0,
        'jsdoc/tag-lines': 0,
        'jsdoc/require-param-description': 0,
        'jsdoc/no-multi-asterisks': 0,
        'jsdoc/check-tag-names': 0
    }
};
