module.exports = {
    'extends': ['../../.eslintrc'],
    'parserOptions': { 'project': './tsconfig.eslint.json', 'sourceType': 'module', 'tsconfigRootDir': __dirname },
    'rules': {
        'import/no-unresolved': 'off', // the rules has issues with UI5 imports
        '@typescript-eslint/no-use-before-define': 'warn',
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/no-this-alias': 'warn',
        'consistent-this': 'off', // that - this
        'space-before-function-paren': 'warn',
        'jsdoc/match-description': 'off',
        'radix': 'off'
    }
};
