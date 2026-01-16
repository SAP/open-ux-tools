# Disallow absolute paths to component includes (sap-no-absolute-component-path)

Giving an absolute path in component includes might produce an error and is no longer supported by UI5.

## Rule Details

The rule checks if `includes` inside a component have a leading `/`.

The following patterns are considered warnings:

```js
code: "sap.ui.core.UIComponent.extend('sap.ui.demokit.explored.Component', { " +
  'metadata : { ' +
  'includes : [ ' +
  "'css/style2.css', " +
  "'/css/style2.css', " +
  "'/css/titles.css' " +
  '], ' +
  'routing : { ' +
  'config : { ' +
  'routerClass : MyRouter, ' +
  "viewType : 'XML', " +
  "viewPath : 'sap.ui.demokit.explored.view', " +
  "targetControl : 'splitApp', " +
  'clearTarget : false ' +
  '}, ' +
  'routes : [ { ' +
  "pattern : 'entity/{id}/{part}', " +
  "name : 'entity', " +
  "view : 'entity', " +
  'viewLevel : 3, ' +
  "targetAggregation : 'detailPages' " +
  '} ]' +
  '} ' +
  '} ' +
  '});';
```

## Bug Report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
