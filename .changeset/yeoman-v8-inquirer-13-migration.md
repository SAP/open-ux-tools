---
"@sap-ux/inquirer-common": minor
"@sap-ux/abap-deploy-config-inquirer": minor
"@sap-ux/cf-deploy-config-inquirer": minor
"@sap-ux/odata-service-inquirer": minor
"@sap-ux/ui5-application-inquirer": minor
"@sap-ux/ui5-library-inquirer": minor
"@sap-ux/ui5-library-reference-inquirer": minor
"@sap-ux/flp-config-inquirer": minor
"@sap-ux/adp-tooling": minor
"@sap-ux/fe-fpm-writer": minor
"@sap-ux/ui-prompting": minor
"@sap-ux/deploy-config-sub-generator": minor
"@sap-ux/repo-app-import-sub-generator": minor
"@sap-ux/generator-adp": minor
"@sap-ux/generator-odata-downloader": patch
"@sap-ux/abap-deploy-config-sub-generator": patch
"@sap-ux/cf-deploy-config-sub-generator": patch
"@sap-ux/adp-flp-config-sub-generator": patch
"@sap-ux/flp-config-sub-generator": patch
"@sap-ux/create": patch
"@sap-ux/fiori-app-sub-generator": patch
"@sap-ux-private/ui-prompting-examples": patch
"@sap-ux/fiori-mcp-server": patch
"@sap-ux/fiori-tools-plugin": patch
---

FEAT: Migrate the prompting stack to inquirer 13 as part of the yeoman-generator 8 upgrade.

The prompt type foundation in `@sap-ux/inquirer-common` is reworked onto inquirer 13: `YUIQuestion` and the concrete question types (`InputQuestion`, `PasswordQuestion`, `ListQuestion`, `SearchQuestion`, etc.) now derive from inquirer 13's `DistinctQuestion`, so they stay assignable to `yeoman-generator`'s `this.prompt(...)` without casting. The former inquirer 8 `ListChoiceOptions` is replaced by a locally defined `ChoiceOptions` type.

Across the inquirer packages, prompts are migrated from the inquirer 8 `list` arm to inquirer 13's `select` arm, and autocomplete prompts move from the `inquirer-autocomplete-prompt` plugin to inquirer 13's native `search` prompt (the plugin runtime dependency is removed where it was used). `default` values now resolve to a choice value rather than a list index, matching inquirer 13 `select`/`search` semantics. Validator and callback signatures are aligned with the inquirer 13 question types.

Generator and consumer packages are updated to the new prompt APIs: the obsolete `promptModule` plumbing that inquirer 13 no longer needs is dropped, `Answers`/`Question` and choice/validator types are sourced from `@sap-ux/inquirer-common` instead of the removed inquirer type exports, and `this.prompt(...)` call sites account for inquirer 13 returning all-optional answers (typed via the `prompt` generic or reconciled as partial answers). Example fixtures in `@sap-ux-private/ui-prompting-examples` are updated to the stricter `PromptQuestion` types. Bundled consumers (`@sap-ux/fiori-mcp-server`, `@sap-ux/generator-odata-downloader`) are rebuilt against the updated `@sap-ux/inquirer-common`, and `@sap-ux/fiori-tools-plugin` is version-synced with `@sap-ux/fiori-mcp-server`.
