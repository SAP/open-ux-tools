# @sap-ux/odata-vocabularies

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
