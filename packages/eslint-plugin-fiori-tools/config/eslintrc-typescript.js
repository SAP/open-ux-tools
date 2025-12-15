const {
    defineConfig,
} = require("eslint/config");

const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");


module.exports = defineConfig([
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
        ],

        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "script",

            parserOptions: {
                projectService: true,
            },
        },

        rules: {
            ...typescriptEslint.configs.recommended.rules,
            ...typescriptEslint.configs['recommended-type-checked'].rules,
            // Warning rules (alphabetical)
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
        },
    }
]);