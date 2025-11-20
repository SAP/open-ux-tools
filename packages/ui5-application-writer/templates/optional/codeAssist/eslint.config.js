const {
    defineConfig,
} = require("eslint/config");

const sapUi5Jsdocs = require("@sap/eslint-plugin-ui5-jsdocs");
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
    extends: compat.extends("plugin:@sap/ui5-jsdocs/recommended", "eslint:recommended"),

    plugins: {
        "@sap/ui5-jsdocs": sapUi5Jsdocs,
    },
}]);