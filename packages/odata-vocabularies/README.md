[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/odata-vocabularies/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/odata-vocabularies)

# [`@sap-ux/odata-vocabularies`](https://github.com/SAP/open-ux-tools/tree/main/packages/odata-vocabularies)

Library that contains the most recent copies of the OData vocabularies authored by OASIS and SAP

## Supported Vocabularies
[OASIS Vocabularies](https://oasis-tcs.github.io/odata-vocabularies)
* Aggregation
* Authorization
* Core
* Capabilities
* Measures
* Temporal
* Repeatability
* Validation
* JSON

[SAP Vocabularies](https://sap.github.io/odata-vocabularies) 
* Analytics
* CodeList
* Common
* Communication
* DataIntegration
* DirectEdit
* Graph
* Hierarchy
* HTML5
* ODM
* PDF
* PersonalData
* Session
* UI

## Maintaining Vocabularies

Both operations are handled by the `odata-vocabularies-sync` skill (`.claude/skills/odata-vocabularies-sync/SKILL.md`).

**Claude Code CLI** — start Claude from the package directory and use the slash command:
```bash
cd packages/odata-vocabularies
claude
```
Then type:
- `/odata-vocabularies-sync` — update all vocabularies
- `/odata-vocabularies-sync https://...` — add a new vocabulary (URL must end in `.json`, XML is not supported)

**VSCode extension** — ask Claude Code in natural language:
- *"sync the odata vocabularies"*
- *"add a new vocabulary: https://... (URL must end in `.json`, XML is not supported)"*

The skill will:
1. *(When adding)* Register the vocabulary in `tools/update.ts`, `src/resources/index.ts`, `src/loader.ts`, and `README.md`
2. Download and regenerate all vocabulary resource files
3. Run tests and update snapshots

After completing, create a changeset with `pnpm cset`.

> **Note:** `com.sap.cds.vocabularies.*` files (ObjectModel, AnalyticsDetails) are hand-crafted and cannot be added this way.

## Local testing in tools-suite

To test local changes to this package inside the XML annotation language server of `tools-suite`, use [yalc](https://github.com/wclr/yalc). `pnpm link` does not work there because the language server is an esbuild bundle and dependencies are resolved at build time.

See [cross-repo-dev.md](https://github.wdf.sap.corp/ux-engineering/tools-suite/blob/master/docs/dev-guide/cross-repo-dev.md) in tools-suite for the full setup and iteration workflow.

**Quick reference — after every change:**
```bash
# in open-ux-tools/packages/odata-vocabularies
pnpm --filter @sap-ux/odata-vocabularies build
yalc push

# in tools-suite root
yalc add @sap-ux/odata-vocabularies
yarn build:scope sap-ux-annotation-modeler-extension
# restart the Extension Host in VS Code
```

## Installation
Npm
`npm install --save @sap-ux/odata-vocabularies`

Yarn
`yarn add @sap-ux/odata-vocabularies`

Pnpm
`pnpm add @sap-ux/odata-vocabularies`


## Usage

1. Import the needed functions in your modules

    ```typescript
    import { VocabularyService } from '@sap/ux-odata-vocabularies';
    ```

## Vocabulary API
The vocabulary API is implemented via class VocabularyService and currently exposes the following functions:

* checkTermApplicability

* getComplexType
* getComplexTypeProperty
* getDerivedTypeNames
* getDocumentation
* getTerm
* getTermsForTargetKinds
* getType
* getVocabularies
* getVocabulary
* getVocabularyNamespace