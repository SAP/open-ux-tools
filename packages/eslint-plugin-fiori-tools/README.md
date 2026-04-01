[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/eslint-plugin-fiori-tools)

# [`@sap-ux/eslint-plugin-fiori-tools`](https://github.com/SAP/open-ux-tools/tree/main/packages/eslint-plugin-fiori-tools)

Custom linting plugin for SAP Fiori apps

## Installation

npm: `npm install --save @sap-ux/eslint-plugin-fiori-tools`

Yarn: `yarn add @sap-ux/eslint-plugin-fiori-tools`

pnpm: `pnpm add @sap-ux/eslint-plugin-fiori-tools`

## Usage

To consume this module, add `@sap-ux/eslint-plugin-fiori-tools` to your project's eslint config file, for example, `eslint.config.mjs`. You must specify one of the following configurations:

- recommended: Contains rules for JavaScript & TypeScript on both production and test code.

- recommended-for-s4hana: contains rules for JavaScript & TypeScript on both production and test code. This configuration is recommended for SAP internal use.

`eslint.config.mjs`
```javascript
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    ...fioriTools.configs.recommended
];
```


## Manually Migrate from `eslint@8`, `@sap-ux/eslint-plugin-fiori-tools@0.6.x`, or `eslint-plugin-fiori-custom`

All rules from `eslint-plugin-fiori-custom` have been migrated to `@sap-ux/eslint-plugin-fiori-tools` version `9`.

Note: ESLint 9 requires you to use the new flat config.
 
1. Create the `eslint.config.mjs` file.
```javascript
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    ...fioriTools.configs.recommended
];
```

2. Copy any values from the `.eslintignore` file (if it exists) into the `eslint.config.mjs` file by adding the `ignores` array.

   For more information, see [https://eslint.org/docs/latest/use/configure/configuration-files#excluding-files-with-ignores](Excluding files with ignores).

   ```javascript
   import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

   export default [
      {
         ignores: ['dist']
      },
         ...fioriTools.configs.recommended
   ];
   ```

3. Delete the `.eslintignore` file.   
4. If the `.eslintrc` file contains only either of the following options, it can be deleted.
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
   **Note**: If you have custom rules or configuration in your `.eslintrc` file, do not delete your `.eslintrc` file. For information about how to migrate your custom rules, see [Migrate to v9.x](https://eslint.org/docs/latest/use/migrate-to-9.0.0).

5. In the `package.json` file, performing the following:

   - Remove `eslint-plugin-fiori-custom`, if it exists.

   - Update `eslint` to version `^9`.

   Update `@sap-ux/eslint-plugin-fiori-tools` to version `^9`.

6. Execute in the project root directory: `npm install`.

7. Find any references to `fiori-custom/` in your source code and replace them with `@sap-ux/fiori-tools/`:
   
   for example,

   `//eslint-disable fiori-custom/sap-browser-api-warning`
   
    becomes
   
   `//eslint-disable @sap-ux/fiori-tools/sap-browser-api-warning`
   

8. Execute in the project root directory: `npm run lint`. Check the output for errors or warnings and fix them.

## [Rules](#rules)

<div style="overflow-x: auto;">

| Since | Rule | Description | Recommended | Recommended for S/4HANA |
|:-----:|------|-------------|:-----------:|:-----------------------:|
| new | [sap-no-data-field-intent-based-navigation](docs/rules/sap-no-data-field-intent-based-navigation.md) | Ensures neither `DataFieldForIntentBasedNavigation` nor `DataFieldWithIntentBasedNavigation` are used in tables or form fields in SAP Fiori elements applications. | | ✅ |
| 9.10.0 | [sap-condensed-table-layout](docs/rules/sap-condensed-table-layout.md) | Requires `condensedTableLayout` to be enabled when using a grid table, analytical table, or tree table. | | ✅ |
| 9.9.0 | [sap-strict-uom-filtering](docs/rules/sap-strict-uom-filtering.md) | Ensures that `disableStrictUomFiltering` is not set to `true` in `sap.fe.app` manifest configuration | | ✅ |
| 9.8.0 | [sap-table-personalization](docs/rules/sap-table-personalization.md) | Ensures that all table `personalization` options are enabled in the OData V4 applications. | | ✅ |
| 9.7.0 | [sap-anchor-bar-visible](docs/rules/sap-anchor-bar-visible.md) | Anchor Bar Visible should not be set to false in manifest settings for object page headers (except form entry object pages). | | ✅ |
| 9.5.0 | [sap-table-column-vertical-alignment](docs/rules/sap-table-column-vertical-alignment.md) | Ensures `tableColumnVerticalAlignment` Configuration for Responsive Type Tables in SAP Fiori Elements applications | | ✅ |
| 9.4.0 | [sap-enable-export](docs/rules/sap-enable-export.md) | Ensures that the export to Excel functionality in any OData V4 applications tables is available | | ✅ |
| 9.4.0 | [sap-enable-paste](docs/rules/sap-enable-paste.md) | Ensures that the paste functionality in any OData V4 applications tables is available | | ✅ |
| 9.3.1 | [sap-state-preservation-mode](docs/rules/sap-state-preservation-mode.md) | Ensures Valid `statePreservationMode` Configuration in SAP Fiori Elements | | ✅ |
| 9.1.0 | [sap-copy-to-clipboard](docs/rules/sap-copy-to-clipboard.md) | Ensures that the copy functionality in any table is enabled. "Copy" button is shown by default. | | ✅ |
| 9.1.0 | [sap-creation-mode-for-table](docs/rules/sap-creation-mode-for-table.md) | Validates that the table creation mode (`createMode` in OData V2 and `creationMode` in OData V4) is correctly configured to ensure an optimal user experience when creating new table entries. | | ✅ |
| 9.1.0 | [sap-flex-enabled](docs/rules/sap-flex-enabled.md) | Ensures that the `flexEnabled` property is set to `true` in the `sap.ui5` section of the `manifest.json` file for applications using UI5 version 1.56 or higher. | | ✅ |
| 9.1.0 | [sap-width-including-column-header](docs/rules/sap-width-including-column-header.md) | Ensures that small tables (less than six columns) have the `widthIncludingColumnHeader` property set to `true` for better calculation of column width. | | ✅ |
| 9.0.0 | [sap-bookmark-performance](docs/rules/sap-bookmark-performance.md) | Ensure the correct usage of the auto-refresh interval options for `sap.ushell.ui.footerbar.AddBookmarkButton`. | ✅ | ✅ |
| 9.0.0 | [sap-browser-api-error](docs/rules/sap-browser-api-error.md) | Detect forbidden usages of `(window.)document` APIs. | | |
| 9.0.0 | [sap-browser-api-warning](docs/rules/sap-browser-api-warning.md) | Detect warnings for usages of `(window.)document` APIs. | ✅ | ✅ |
| 9.0.0 | [sap-cross-application-navigation](docs/rules/sap-cross-application-navigation.md) | Do not use a static list of cross-application navigation targets. | ✅ | ✅ |
| 9.0.0 | [sap-forbidden-window-property](docs/rules/sap-forbidden-window-property.md) | Detect the definition of global properties in the `window` object. | ✅ | ✅ |
| 9.0.0 | [sap-message-toast](docs/rules/sap-message-toast.md) | Ensure the usage of the correct method options for `sap.m.MessageToast.show`. | ✅ | ✅ |
| 9.0.0 | [sap-no-absolute-component-path](docs/rules/sap-no-absolute-component-path.md) | Detect the absolute path to the component. | ✅ | ✅ |
| 9.0.0 | [sap-no-br-on-return](docs/rules/sap-no-br-on-return.md) | Detect the usage of `document.queryCommandSupported` with the `insertBrOnReturn` argument. | ✅ | ✅ |
| 9.0.0 | [sap-no-commons-usage](docs/rules/sap-no-commons-usage.md) | Detect the usage of `sap.ui.commons` objects. | ✅ | ✅ |
| 9.0.0 | [sap-no-dom-access](docs/rules/sap-no-dom-access.md) | Detect direct DOM access. Use the jQuery selector instead. | ✅ | ✅ |
| 9.0.0 | [sap-no-dom-insertion](docs/rules/sap-no-dom-insertion.md) | Detect direct DOM insertion. | ✅ | ✅ |
| 9.0.0 | [sap-no-dynamic-style-insertion](docs/rules/sap-no-dynamic-style-insertion.md) | Detect the usage of `document.styleSheets` (dynamic style insertion). | ✅ | ✅ |
| 9.0.0 | [sap-no-element-creation](docs/rules/sap-no-element-creation.md) | Detect direct element creation. | ✅ | ✅ |
| 9.0.0 | [sap-no-encode-file-service](docs/rules/sap-no-encode-file-service.md) | Detect the usage of `/sap/bc/ui2/encode_file`. | ✅ | ✅ |
| 9.0.0 | [sap-no-event-prop](docs/rules/sap-no-event-prop.md) | Flag use of private members from `sap.ui.base.Event`. Use `sap-no-ui5base-prop` instead. | | |
| 9.0.0 | [sap-no-exec-command](docs/rules/sap-no-exec-command.md) | Detect the usage of `execCommand`. | ✅ | ✅ |
| 9.0.0 | [sap-no-global-define](docs/rules/sap-no-global-define.md) | Detect the definition of global properties in the `window` object. | ✅ | ✅ |
| 9.0.0 | [sap-no-global-event](docs/rules/sap-no-global-event.md) | Detect the global event handling override. | ✅ | ✅ |
| 9.0.0 | [sap-no-global-selection](docs/rules/sap-no-global-selection.md) | Detect global selection modification. | ✅ | ✅ |
| 9.0.0 | [sap-no-global-variable](docs/rules/sap-no-global-variable.md) | Disallow global variable declarations. | ✅ | ✅ |
| 9.0.0 | [sap-no-hardcoded-color](docs/rules/sap-no-hardcoded-color.md) | Flag use of hardcoded colors. | ✅ | ✅ |
| 9.0.0 | [sap-no-hardcoded-url](docs/rules/sap-no-hardcoded-url.md) | Flag use of hardcoded (non-relative) URLs. | ✅ | ✅ |
| 9.0.0 | [sap-no-history-manipulation](docs/rules/sap-no-history-manipulation.md) | Detect warnings for usages of history manipulation APIs. | ✅ | ✅ |
| 9.0.0 | [sap-no-inner-html-access](docs/rules/sap-no-inner-html-access.md) | Detect access of the `innerHTML` property. | ✅ | ✅ |
| 9.0.0 | [sap-no-inner-html-write](docs/rules/sap-no-inner-html-write.md) | Detect overriding of `innerHTML`. | ✅ | ✅ |
| 9.0.0 | [sap-no-jquery-device-api](docs/rules/sap-no-jquery-device-api.md) | Flag use of the deprecated `jQuery.device` API. | ✅ | ✅ |
| 9.0.0 | [sap-no-localhost](docs/rules/sap-no-localhost.md) | Detect the usage of `localhost`. | ✅ | ✅ |
| 9.0.0 | [sap-no-localstorage](docs/rules/sap-no-localstorage.md) | Detect the usage of `localStorage`. | ✅ | ✅ |
| 9.0.0 | [sap-no-location-reload](docs/rules/sap-no-location-reload.md) | Detect the usage of `location.reload`. | ✅ | ✅ |
| 9.0.0 | [sap-no-location-usage](docs/rules/sap-no-location-usage.md) | Detect the usage of location assignments. | ✅ | ✅ |
| 9.0.0 | [sap-no-navigator](docs/rules/sap-no-navigator.md) | Detect the usage of the `navigator` object. | ✅ | ✅ |
| 9.0.0 | [sap-no-override-rendering](docs/rules/sap-no-override-rendering.md) | Flag override of rendering, getters, or setters for SAPUI5 objects. | ✅ | ✅ |
| 9.0.0 | [sap-no-override-storage-prototype](docs/rules/sap-no-override-storage-prototype.md) | Detect override of the storage prototype. | ✅ | ✅ |
| 9.0.0 | [sap-no-proprietary-browser-api](docs/rules/sap-no-proprietary-browser-api.md) | Detect warnings for usages of proprietary browser APIs. | ✅ | ✅ |
| 9.0.0 | [sap-no-sessionstorage](docs/rules/sap-no-sessionstorage.md) | Detect the usage of `sessionStorage`. | ✅ | ✅ |
| 9.0.0 | [sap-no-ui5-prop-warning](docs/rules/sap-no-ui5-prop-warning.md) | Flag use of private members of the `sap.ui.model.odata.v2.ODataModel`. | ✅ | ✅ |
| 9.0.0 | [sap-no-ui5base-prop](docs/rules/sap-no-ui5base-prop.md) | Flag use of private members from `sap.ui.base` classes. | ✅ | ✅ |
| 9.0.0 | [sap-no-ui5eventprovider-prop](docs/rules/sap-no-ui5eventprovider-prop.md) | Detect private property usage of `sap.ui.base.EventProvider`. Use `sap-no-ui5base-prop` instead. | | |
| 9.0.0 | [sap-no-ui5odatamodel-prop](docs/rules/sap-no-ui5odatamodel-prop.md) | Detect private property usage of the UI5 OData model. Use `sap-no-ui5base-prop` instead. | | |
| 9.0.0 | [sap-no-window-alert](docs/rules/sap-no-window-alert.md) | Flag use of `window.alert`. | | |
| 9.0.0 | [sap-opa5-autowait-true](docs/rules/sap-opa5-autowait-true.md) | Check if `autowait` is `true` in `Opa5.extendConfig`. | ✅ | ✅ |
| 9.0.0 | [sap-timeout-usage](docs/rules/sap-timeout-usage.md) | Detect `setTimeout` usage with a value greater than zero. | ✅ | ✅ |
| 9.0.0 | [sap-ui5-forms](docs/rules/sap-ui5-forms.md) | Detect invalid content for `SimpleForm`, `Form`, and `SmartForm`. | ✅ | ✅ |
| 9.0.0 | [sap-ui5-global-eval](docs/rules/sap-ui5-global-eval.md) | Detect the usage of `globalEval()` and `eval()`. | ✅ | ✅ |
| 9.0.0 | [sap-ui5-legacy-factories](docs/rules/sap-ui5-legacy-factories.md) | Detect legacy UI5 factories that lead to synchronous loading. | ✅ | ✅ |
| 9.0.0 | [sap-ui5-legacy-jquerysap-usage](docs/rules/sap-ui5-legacy-jquerysap-usage.md) | Detect legacy `jQuery.sap` usage. | ✅ | ✅ |
| 9.0.0 | [sap-ui5-no-private-prop](docs/rules/sap-ui5-no-private-prop.md) | Detect the usage of private properties and functions of UI5 elements. | | |
| 9.0.0 | [sap-usage-basemastercontroller](docs/rules/sap-usage-basemastercontroller.md) | Detect the usage of the deprecated `BaseMasterController`. | ✅ | ✅ |
</div>
