// https://prettier.io/docs/en/options.html
// https://prettier.io/docs/en/options.html#parser

/* Override the shared config in individual packages if required like this:
    module.exports = {
    ...require("@company/prettier-config"),
    semi: false
    };
*/
module.exports = {
    arrowParens: 'always',
    bracketSpacing: true,
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'css',
    bracketSameLine: true,
    jsxSingleQuote: false,
    printWidth: 120,
    proseWrap: 'preserve',
    quoteProps: 'as-needed',
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'none',
    useTabs: false
};
