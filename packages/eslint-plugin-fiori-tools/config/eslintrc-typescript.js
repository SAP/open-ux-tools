const {
    defineConfig,
} = require("eslint/config");

const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const js = require("@eslint/js");
const tseslint = require('typescript-eslint');



module.exports = defineConfig([
    ...tseslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
    files: ["./webapp/*.ts", "./webapp/**/*.ts"],

    ignores: [
        "target/**",
        "webapp/test/changes_loader.ts",
        "webapp/test/changes_preview.ts",
        "webapp/localservice/**",
        "webapp/localService/**",
        "undefined/**/Example.qunit.ts",
        "backup/**",
        "**/*.d.ts",
        "**/*.d.ts",
    ],

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: true,
        },
    },

    rules: {
        "@typescript-eslint/no-unsafe-call": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
        "@typescript-eslint/no-unsafe-return": "warn",
        "@typescript-eslint/no-unsafe-argument": "warn",
        "@typescript-eslint/no-unsafe-assignment": "warn",
    },
}]);