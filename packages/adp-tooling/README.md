#  `@sap-ux/adp-tooling`

A module containing different tooling modules helpful when working with SAP UI5 adaptation projects.

## Submodules

### preview
The submodule preview contains functionality allowing to preview adaptation projects. It is not a standalone UI5 middleware but designed to be integrated into the `@sap-ux/preview-middleware.`.

### writer
The submodule writer contains functionality to generate the core project structure of an SAP UI5 adaptation project. It is not a standalone generator but designed to be integrated into `@sap-ux/create` or any kind of yeoman generator.

### base
The submodule contains functionality required in different scenarios, e.g. prompting for generation or when initializing the preview.

## Templates
The templates folder contains ejs templates to be used for the generation of new adaptation projects as well as to generate artifacts in existing adaptation projects.