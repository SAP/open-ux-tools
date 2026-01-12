[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/eslint-plugin-fiori-tools)

# [`@sap-ux/eslint-plugin-fiori-tools`](https://github.com/SAP/open-ux-tools/tree/main/packages/eslint-plugin-fiori-tools)

Custom linting plugin for SAPUI5 Fiori apps

## Installation

Npm
`npm install --save @sap-ux/eslint-plugin-fiori-tools`

Yarn
`yarn add @sap-ux/eslint-plugin-fiori-tools`

Pnpm
`pnpm add @sap-ux/eslint-plugin-fiori-tools`

## Usage

To consume this module, add @sap-ux/eslint-plugin-fiori-tools in your project eslint config file (e.g. `eslint.config.js`). You must specify one of the following configurations:

- recommended: contains rules for JavaScript & TypeScript on both prod and test code.

- recommended-for-s4hana: contains rules for JavaScript & TypeScript on both prod and test code. recommended for SAP internal use.

`eslint.config.js`
```javascript
const fioriTools  = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = [
    ...fioriTools.configs.recommended
];
```


## Manually Migrating from Eslint@8, @sap-ux/eslint-plugin-fiori-tools@0.6.x and/or eslint-plugin-fiori-custom

All rules from `eslint-plugin-fiori-custom` have been migrated to `@sap-ux/eslint-plugin-fiori-tools` version `9`.

Eslint 9 requires changing to use the new flat config.
 
1. Create `eslint.config.js`
```javascript
const fioriTools  = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = [
    ...fioriTools.configs.recommended
];
```

2. Copy any values from `.eslintignore` (if it exists) into `eslint.config.js` by adding the `ignores` array.

   More info at https://eslint.org/docs/latest/use/configure/configuration-files#excluding-files-with-ignores

   ```javascript
   const fioriTools  = require('@sap-ux/eslint-plugin-fiori-tools');

   module.exports = [
        {
        ignores: ['dist']
        },
       ...fioriTools.configs.recommended,
   ];
   ```

3. Delete the `.eslintignore` file   
5. If the `.eslintrc` file contains only either of these content it can be deleted. `eslint.config.js` from step 1 is the equivalent.
   ```
   {
    "extends": "plugin:@sap-ux/eslint-plugin-fiori-tools/defaultJS",
    "root": true
   }
   ```
   or 
   ```
   {
    "extends": "plugin:@sap-ux/eslint-plugin-fiori-tools/defaultTS",
    "root": true
   }
   ```
   **Note**: If you have custom rules or configuration in .eslintrc file please check https://eslint.org/docs/latest/use/migrate-to-9.0.0 for details on how it migrate the content.

6. In the package.json

   Remove `eslint-plugin-fiori-custom` if it exists in the package.json

   Update `eslint` to version `^9`

   Update `@sap-ux/eslint-plugin-fiori-tools` to version `^9`

6. Execute in the project root directory
   `npm install`

8. Find in source code an references to `fiori-custom/`  and replace with `@sap-ux/fiori-tools/`
   
   e.g.

   `//eslint-disable fiori-custom/sap-browser-api-warning`
   
    becomes
   
   `//eslint-disable @sap-ux/fiori-tools/sap-browser-api-warning`
   

10. Execute in the project root directory

   `npm run lint`

   Check output for errors and warning. Fix as normal.

## Rules

✅ Set in the `recommended` configuration

| Rule | Description | Recommended |
|------|-------------|:-----------:|
| [sap-bookmark-performance](docs/rules/sap-bookmark-performance.md) | Ensure correct usage of auto refresh interval options for sap.ushell.ui.footerbar.AddBookmarkButton | ✅ |
| [sap-browser-api-error](docs/rules/sap-browser-api-error.md) | Detect forbidden usages of (window.)document APIs | |
| [sap-browser-api-warning](docs/rules/sap-browser-api-warning.md) | Detect warnings for usages of (window.)document APIs | ✅ |
| [sap-cross-application-navigation](docs/rules/sap-cross-application-navigation.md) | Do not use a static list of cross-application navigation targets | ✅ |
| [sap-forbidden-window-property](docs/rules/sap-forbidden-window-property.md) | Detect the definition of global properties in the window object | ✅ |
| [sap-message-toast](docs/rules/sap-message-toast.md) | Ensure usage of correct method options for sap.m.MessageToast.show | ✅ |
| [sap-no-absolute-component-path](docs/rules/sap-no-absolute-component-path.md) | Detect absolute path to component | ✅ |
| [sap-no-br-on-return](docs/rules/sap-no-br-on-return.md) | Detect usage of document.queryCommandSupported with 'insertBrOnReturn' argument | ✅ |
| [sap-no-commons-usage](docs/rules/sap-no-commons-usage.md) | Detect usage of sap.ui.commons objects | ✅ |
| [sap-no-dom-access](docs/rules/sap-no-dom-access.md) | Detect direct DOM access, use jQuery selector instead | ✅ |
| [sap-no-dom-insertion](docs/rules/sap-no-dom-insertion.md) | Detect direct DOM insertion | ✅ |
| [sap-no-dynamic-style-insertion](docs/rules/sap-no-dynamic-style-insertion.md) | Detect usage of document.styleSheets (dynamic style insertion) | ✅ |
| [sap-no-element-creation](docs/rules/sap-no-element-creation.md) | Detect direct element creation | ✅ |
| [sap-no-encode-file-service](docs/rules/sap-no-encode-file-service.md) | Detect usage of '/sap/bc/ui2/encode_file' | ✅ |
| [sap-no-event-prop](docs/rules/sap-no-event-prop.md) | Flag use of private members from sap.ui.base.Event (deprecated, use sap-no-ui5base-prop) | |
| [sap-no-exec-command](docs/rules/sap-no-exec-command.md) | Detect usage of execCommand | ✅ |
| [sap-no-global-define](docs/rules/sap-no-global-define.md) | Detect definition of global properties in the window object | ✅ |
| [sap-no-global-event](docs/rules/sap-no-global-event.md) | Detect global event handling override | ✅ |
| [sap-no-global-selection](docs/rules/sap-no-global-selection.md) | Detect global selection modification | ✅ |
| [sap-no-global-variable](docs/rules/sap-no-global-variable.md) | Disallow global variable declarations | ✅ |
| [sap-no-hardcoded-color](docs/rules/sap-no-hardcoded-color.md) | Flag use of hardcoded colors | ✅ |
| [sap-no-hardcoded-url](docs/rules/sap-no-hardcoded-url.md) | Flag use of hardcoded (non-relative) URLs | ✅ |
| [sap-no-history-manipulation](docs/rules/sap-no-history-manipulation.md) | Detect warnings for usages of history manipulation APIs | ✅ |
| [sap-no-inner-html-access](docs/rules/sap-no-inner-html-access.md) | Detect access of the innerHTML property | ✅ |
| [sap-no-inner-html-write](docs/rules/sap-no-inner-html-write.md) | Detect overriding of innerHTML | ✅ |
| [sap-no-jquery-device-api](docs/rules/sap-no-jquery-device-api.md) | Flag use of deprecated jQuery.device API | ✅ |
| [sap-no-localhost](docs/rules/sap-no-localhost.md) | Detect usage of 'localhost' | ✅ |
| [sap-no-localstorage](docs/rules/sap-no-localstorage.md) | Detect usage of localStorage | ✅ |
| [sap-no-location-reload](docs/rules/sap-no-location-reload.md) | Detect usage of location.reload | ✅ |
| [sap-no-location-usage](docs/rules/sap-no-location-usage.md) | Detect usage of location assignments | ✅ |
| [sap-no-navigator](docs/rules/sap-no-navigator.md) | Detect usage of navigator object | ✅ |
| [sap-no-override-rendering](docs/rules/sap-no-override-rendering.md) | Flag override of rendering, getters, or setters for SAPUI5 objects | ✅ |
| [sap-no-override-storage-prototype](docs/rules/sap-no-override-storage-prototype.md) | Detect override of storage prototype | ✅ |
| [sap-no-proprietary-browser-api](docs/rules/sap-no-proprietary-browser-api.md) | Detect warnings for usages of proprietary browser APIs | ✅ |
| [sap-no-sessionstorage](docs/rules/sap-no-sessionstorage.md) | Detect usage of sessionStorage | ✅ |
| [sap-no-ui5-prop-warning](docs/rules/sap-no-ui5-prop-warning.md) | Flag use of private members of sap.ui.model.odata.v2.ODataModel | ✅ |
| [sap-no-ui5base-prop](docs/rules/sap-no-ui5base-prop.md) | Flag use of private members from sap.ui.base classes | ✅ |
| [sap-no-ui5eventprovider-prop](docs/rules/sap-no-ui5eventprovider-prop.md) | Detect private property usage of sap.ui.base.EventProvider (deprecated, use sap-no-ui5base-prop) | |
| [sap-no-ui5odatamodel-prop](docs/rules/sap-no-ui5odatamodel-prop.md) | Detect private property usage of UI5 OData model (deprecated, use sap-no-ui5base-prop) | |
| [sap-no-window-alert](docs/rules/sap-no-window-alert.md) | Flag use of window.alert | |
| [sap-opa5-autowait-true](docs/rules/sap-opa5-autowait-true.md) | Check if autowait is true in Opa5.extendConfig | ✅ |
| [sap-timeout-usage](docs/rules/sap-timeout-usage.md) | Detect setTimeout usage with value > 0 | ✅ |
| [sap-ui5-forms](docs/rules/sap-ui5-forms.md) | Detect invalid content for SimpleForm / Form / SmartForm | ✅ |
| [sap-ui5-global-eval](docs/rules/sap-ui5-global-eval.md) | Detect usage of globalEval() / eval() | ✅ |
| [sap-ui5-legacy-factories](docs/rules/sap-ui5-legacy-factories.md) | Detect legacy UI5 factories leading to synchronous loading | ✅ |
| [sap-ui5-legacy-jquerysap-usage](docs/rules/sap-ui5-legacy-jquerysap-usage.md) | Detect legacy jQuery.sap usage | ✅ |
| [sap-ui5-no-private-prop](docs/rules/sap-ui5-no-private-prop.md) | Detect usage of private properties and functions of UI5 elements | |
| [sap-usage-basemastercontroller](docs/rules/sap-usage-basemastercontroller.md) | Detect usage of deprecated BaseMasterController | ✅ |
