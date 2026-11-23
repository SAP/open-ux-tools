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
* Auditing
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
* Support
* UI

## Maintaining Vocabularies

Use the `odata-vocabularies-sync` skill (`.agents/skills/odata-vocabularies-sync/SKILL.md`) via an AI agent:

- No argument — update all existing vocabularies to their latest published versions
- With a JSON URL (must end in `.json`, XML is not supported) — register a new vocabulary, then update all

## Local testing in tools-suite

To test local changes to this package inside the XML annotation language server of `tools-suite`, use [yalc](https://github.com/wclr/yalc). `pnpm link` does not work there because the language server is an esbuild bundle and dependencies are resolved at build time.

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
    import { VocabularyService } from '@sap-ux/odata-vocabularies';
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