# Supported Vocabularies

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

# Usage

1. Add the Vocabularies library to package.json as a dependency in your project:

    ```typescript
    yarn add @sap/ux-odata-vocabularies 
    ```
    [check latest library version here](https://github.wdf.sap.corp/ux-engineering/tools-suite/blob/master/packages/lib/vocabularies/package.json#L3)

1. Run yarn install and yarn build at monorepo root folder

    ```typescript
    yarn install @sap/ux-odata-vocabularies@<latest_library_version>
    yarn build --scope @sap/ux-odata-vocabularies
    ```
    [check latest library version here](https://github.wdf.sap.corp/ux-engineering/tools-suite/blob/master/packages/lib/vocabularies/package.json#L3)

1. Import the needed functions in your modules

    ```typescript
    import { VocabularyService } from '@sap/ux-odata-vocabularies';
    ```

# Vocabulary API

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

For usage examples have a look at our [unit tests](https://github.wdf.sap.corp/ux-engineering/tools-suite/blob/master/packages/lib/vocabularies/test/vocabularyService.test.ts)
