#  `@sap-ux/adp-tooling`

A module containing different tooling modules helpful when working with SAP UI5 adaptation projects.

## Submodules

### preview
The submodule preview contains functionality allowing to preview adaptation projects. It is not a standalone UI5 middleware but designed to be integrated into the `@sap-ux/preview-middleware.`.

#### preview/client
This is a special module that is transpiled separately to run in the browser as part of the UI5 RTA overlay. Any communication with the middleware middleware (server) code is done via http.

### writer
The submodule writer contains functionality to generate the core project structure of an SAP UI5 adaptation project. It is not a standalone generator but designed to be integrated into `@sap-ux/create` or any kind of yeoman generator.

### base
The submodule contains functionality required in different scenarios, e.g. prompting for generation or when initializing the preview.

## Development
The standard `src` folder except the subfolder `src/preview/client` is transpiled into the dist folder. Additionally, the sources from `src/preview/client` are transpiled using babel into UI5 compatible client sources that can be used in previews to extend the runtime adaption with additional plugins. 

## Templates
The templates folder contains ejs templates to be used for the generation of new adaptation projects as well as to generate artifacts in existing adaptation projects.