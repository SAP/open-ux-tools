#  EXPERIMENTAL `@sap-ux/cards-editor-middleware`

A middleware to store generation card manifest and i18n text to application repository. Middlware is configured by `@sap-ux/cards-editor-config-writer`

## Installation
Npm
`npm install --save @sap-ux/@sap-ux/cards-editor-middleware`

Yarn
`yarn add @sap-ux/@sap-ux/cards-editor-middleware`

Pnpm
`pnpm add @sap-ux/@sap-ux/cards-editor-middleware`

## Usage
Once `@sap-ux/cards-editor-config-writer` runs successfully, it will add `sap-cards-generator` to ui5.yaml configuration. Generated cards along with the i18n will be saved in the application repository.

See more complex example in [`/test/unit`](./test/unit)

## Keywords
SAP Fiori elements
EXPERIMENTAL
