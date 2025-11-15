const {
    defineConfig,
} = require("eslint/config");

const fioriCustom = require("eslint-plugin-fiori-custom");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    files: ["webapp/test/**/*.js", "webapp/test/**/*.ts"],
    ignores: ["**/*.d.ts", "**/*.d.ts"],
    extends: compat.extends("plugin:fiori-custom/fioriToolsTestcode"),

    plugins: {
        "fiori-custom": fioriCustom,
    },
}]);