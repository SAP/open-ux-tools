// https://prettier.io/docs/en/options.html
// https://prettier.io/docs/en/options.html#parser
// https://github.wdf.sap.corp/ux-engineering/tools-suite/blob/master/docs/dev-guide/formatting.md

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
    jsxBracketSameLine: true,
    jsxSingleQuote: false,
    printWidth: 120,
    proseWrap: 'preserve',
    quoteProps: 'as-needed',
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'none',
    useTabs: false,
    overrides: [
        {
            files: ['*.yaml', '*.yml', '*.json'],
            options: { tabWidth: 2 }
        }
    ]
};
