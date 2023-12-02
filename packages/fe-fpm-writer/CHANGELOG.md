# @sap-ux/fe-fpm-writer

## 0.24.2

### Patch Changes

-   3c5fa042: fpm localize custom xml view

## 0.24.1

### Patch Changes

-   deabc5bd: Remove hardcode string in XML view templates

## 0.24.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

## 0.23.9

### Patch Changes

-   d880c217: Correction for `stashed` property of header sections in manifest template: Property type is changed from string to boolean

## 0.23.8

### Patch Changes

-   c11f6c02: Correction for `templateEdit` property in manifest which led to parsing errors: Missing comma is added right after `templateEdit` value if it exists

## 0.23.7

### Patch Changes

-   7a2229ff: Fix. Avoid overwrite of existing extension fragment file while creating new filter field.

## 0.23.6

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build

## 0.23.5

### Patch Changes

-   7b156515: fix(deps): update dependency xpath to v0.0.33

## 0.23.4

### Patch Changes

-   01fa690e: fix(deps): update dependency @xmldom/xmldom to v0.8.10
-   3137514f: use platform independent UI5 CDN URLs

## 0.23.3

### Patch Changes

-   7c8a6946: fix(deps): update dependency semver to v7.5.4

## 0.23.2

### Patch Changes

-   78e726a6: Custom Filter Field. Property "eventHandler".
    1. Generated fragment requires js file when no "eventHandler" is passed.
    2. Wrong reference to js file is generated in fragment, when "eventHandler.fileName" is passed.

## 0.23.1

### Patch Changes

-   da6aed84: Correction for content of generated fragment for `templateEdit` property: Content is wrapped inside `sap.ui.layout.form.FormElement`

## 0.23.0

### Minor Changes

-   c1c9396a: Feature: Custom header sections support for fe-fpm-writer

## 0.22.3

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.

## 0.22.2

### Patch Changes

-   d9355692: Upgrade vulnerable modules semver and fast-xml-parser

## 0.22.1

### Patch Changes

-   b7b25d00: Fix. Allow to create custom section or subsection without 'position' property.

## 0.22.0

### Minor Changes

-   36ccc8eb: Add support to generate table building blocks

## 0.21.0

### Minor Changes

-   2de44bb9: Feature. Add VBox wrapper container to generated content for custom section and sub section

## 0.20.3

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues

## 0.20.2

### Patch Changes

-   2fc69d95: Fix: generated typescript controller extension does not work with latest ui5-application-writer version

## 0.20.1

### Patch Changes

-   0aa02ab0: TBI - Clean up eslint warnings in generated projects

## 0.20.0

### Minor Changes

-   5c16776d: Generate custom filter

## 0.19.1

### Patch Changes

-   cca1095c: remove of superfluous checks in template

## 0.19.0

### Minor Changes

-   970dc528: Feature: Custom SubSections support for fe-fpm-writer

## 0.18.9

### Patch Changes

-   1522b416: Remove redundant commas from templates

## 0.18.8

### Patch Changes

-   3391be7f: Feature enhancement: in addition to the entity (set) you now can define a contextPath that gets written instead of entitySet into the `options > settings` of the new page.

## 0.18.7

### Patch Changes

-   81e3f25: Fix: Controller extensions. Typescript error "Subsequent property declarations must have the same type." displayed for typescript application when both extension controllers created for ListReport and ObjectPage.

## 0.18.6

### Patch Changes

-   d350038: chore - TypeScript 4.9.4 upgrade

## 0.18.5

### Patch Changes

-   ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues

## 0.18.4

### Patch Changes

-   d167d79: Fix: writing into manifest.json always provides 2 spaces for tab size. Additional property 'tabInfo' can be passed in config for generation functions or tab sizing will be calculated before saving

## 0.18.3

### Patch Changes

-   6e4c6c4: Feature: Merge a new custom view with an existing view of the same key

## 0.18.2

### Patch Changes

-   b727719: chore(open-ux-tools) upgrade @xmldom/xmldom

## 0.18.1

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability

## 0.18.0

### Minor Changes

-   b0553a0: If a given file is specified in the API of the FPM writer, no implicit conversion of the name shall take place. Only if no file name get passed, the default value now follows the naming convention of uppercase first letter.

## 0.17.8

### Patch Changes

-   703dc96: Upgrade @xmldom/xmldom dependency to fix security vulnerability CVE-2022-39353

## 0.17.7

### Patch Changes

-   11c8f5d: Use manifest types from @sap-ux/project-access

## 0.17.6

### Patch Changes

-   9820cef: Upgrade @xmldom/xmldom dependency to fix security vulnerability CVE-2022-37616

## 0.17.5

### Patch Changes

-   5b487ef: chore - Apply linting to test folders and linting fixes

## 0.17.4

### Patch Changes

-   4f17a53: Add 'sap.se.macros' namespace to custom section's 'Fragment.xml' when ui5 version >= 1.90

## 0.17.3

### Patch Changes

-   b72abf0: Fix: generate type dependency based on provided versions

## 0.17.2

### Patch Changes

-   c9461f0: Fix: 'enableFPM' method throws 'Invalid Version' exception if unknown UI5 version stored in '["sap.ui5"]["dependencies"]["minUI5Version"]'. Like version '\${sap.ui5.dist.version}'

## 0.17.1

### Patch Changes

-   0bb70df: Adds sap.fe.macros namespace to fpm apps View.xml where ui5 version >= 1.94

## 0.17.0

### Minor Changes

-   7b31c68: Breaking fix of API to properly support minimum UI5 version as input

## 0.16.0

### Minor Changes

-   4fb53ce: Fix sonar warnings

## 0.15.0

### Minor Changes

-   e00e583: Controller Extension support

## 0.14.3

### Patch Changes

-   a1dc069: Improves template path handling for bundling consumers. Fixes minor issue. TBI: #650

## 0.14.2

### Patch Changes

-   b76323d: Fix for generating a Component.ts using enableFpm

## 0.14.1

### Patch Changes

-   c86bfaf: Using better types and improved quality of generate TS projects

## 0.14.0

### Minor Changes

-   d351f81: Typescript support added

## 0.13.6

### Patch Changes

-   9e6d402: Add id to page in generated custom page

## 0.13.5

### Patch Changes

-   aee31b4: Fix issue with fe-fpm-writer module's building block generator to add macros namespace if it is not found in the xml view.

## 0.13.4

### Patch Changes

-   30afc5f: Override glob-parent due to ReDos vulnerability

## 0.13.3

### Patch Changes

-   09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies

## 0.13.2

### Patch Changes

-   4c1b0c2: Custom Action. Optional "anchor" position property. Do not include "anchor" property if undefined is passed

## 0.13.1

### Patch Changes

-   cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm

## 0.13.0

### Minor Changes

-   a32cb3a: `eventHandler` property enhancement for custom actions, sections, columns and views:
    -   Allow to update existing js handler file with new method by providing method as script fragment string;
    -   Allow to pass file and method name for new custom handler js file;
    -   Custom Actions. `eventHandler` property is moved from `CustomAction.settings` to root level of `CustomAction` interface.

## 0.12.0

### Minor Changes

-   338dcb6: Add support to generate building blocks

## 0.11.0

### Minor Changes

-   4bda671: Removed unused property and fixed route generation for FCL

## 0.10.0

### Minor Changes

-   ab39dae: "requireSelection" property support for custom action in fe-fpm-writer

## 0.9.0

### Minor Changes

-   52c3af0: Support for generating standard Fiori elements page types added.

## 0.8.0

### Minor Changes

-   dc0fb1c: Feature: Custom Views support for fe-fpm-writer

## 0.7.0

### Minor Changes

-   6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

## 0.6.2

### Patch Changes

-   c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.

## 0.6.1

### Patch Changes

-   b5ab868: Changing versions of dependent modules to fix vulnerabilities

## 0.6.0

### Minor Changes

-   29a3ebe: Feature: enable FPM in an existing UI5 application

## 0.5.4

### Patch Changes

-   5b5355c: Fix: adding a custom page to an empty FE FPM application with FCL enabled

## 0.5.3

### Patch Changes

-   c18fc5c: chore(open-ux-tools) update devDependencies and change dependabot config

## 0.5.2

### Patch Changes

-   0837ac1: Add missing information to package.json and enforced use of higher version of minimist

## 0.5.1

### Patch Changes

-   7107fbc: chore - use import type in TS code.

## 0.5.0

### Minor Changes

-   1ee1501: custom extension - consider backslashes when "folder" converted into namespace for "template"

## 0.4.1

### Patch Changes

-   f989e61: Fix: incorrect json generated if optional paramater is missing

## 0.4.0

### Minor Changes

-   85c75f2: For all extension types, prevent overwiting existing files.
    Files only will be created and filled with default values if they do not exist yet.

## 0.3.1

### Patch Changes

-   b0f69fe: Custom Section. Fix to support old(<1.86) and new(>=1.86) manifest.json syntaxes

## 0.3.0

### Minor Changes

-   c50f4e0: Custom Section support for fe-fpm-writer

## 0.2.1

### Patch Changes

-   b7617b6: Use consistent whitespace for indentation in templates

## 0.2.0

### Minor Changes

-   62e7369: Initial version of the Fiori elements flexible programming model write supporting custom action, columns and pages
