# @sap-ux/fiori-generator-shared

## 0.6.2

### Patch Changes

-   Updated dependencies [15e6959]
    -   @sap-ux/project-access@1.28.0

## 0.6.1

### Patch Changes

-   Updated dependencies [eb74890]
    -   @sap-ux/project-access@1.27.6

## 0.6.0

### Minor Changes

-   d40af34: adds new module @sap-ux/ui5-library-sub-generator

## 0.5.1

### Patch Changes

-   Updated dependencies [a64a3a5]
    -   @sap-ux/project-access@1.27.5

## 0.5.0

### Minor Changes

-   04988f1: Refactor shared logic for generating package.json scripts for FF and FE

## 0.4.0

### Minor Changes

-   484195d: Enhancements to FE & FF Configurations: The updates include adding the `start-variants-management` script to `package.json` for FE and FF. The OdataService interface now has an `ignoreCertError` property. UI5 application writer introduces the `sapuxLayer` property to `package.json` templates and adds `fiori-tools-preview middleware` to ui5, ui5-mock, and ui5-local.yaml. Additionally, the `addFioriToolsPreviewMiddleware` function has been added for YAML config integration.

### Patch Changes

-   @sap-ux/project-access@1.27.4

## 0.3.21

### Patch Changes

-   Updated dependencies [070182d]
    -   @sap-ux/project-access@1.27.3

## 0.3.20

### Patch Changes

-   Updated dependencies [09522df]
    -   @sap-ux/project-access@1.27.2

## 0.3.19

### Patch Changes

-   Updated dependencies [d962ce1]
    -   @sap-ux/project-access@1.27.1

## 0.3.18

### Patch Changes

-   Updated dependencies [df29368]
    -   @sap-ux/project-access@1.27.0

## 0.3.17

### Patch Changes

-   @sap-ux/project-access@1.26.9

## 0.3.16

### Patch Changes

-   Updated dependencies [d3dafeb]
    -   @sap-ux/btp-utils@0.15.2

## 0.3.15

### Patch Changes

-   3e1a83a: FEAT - Move Guided Help code into a new module @sap-ux/guided-answers-helper

## 0.3.14

### Patch Changes

-   12504d5: adds new module @sap-ux/abap-deploy-config-inquirer

## 0.3.13

### Patch Changes

-   Updated dependencies [df6262e]
    -   @sap-ux/project-access@1.26.8

## 0.3.12

### Patch Changes

-   @sap-ux/project-access@1.26.7

## 0.3.11

### Patch Changes

-   Updated dependencies [82aaea3]
    -   @sap-ux/project-access@1.26.6

## 0.3.10

### Patch Changes

-   Updated dependencies [cc16cbb]
    -   @sap-ux/project-access@1.26.5

## 0.3.9

### Patch Changes

-   @sap-ux/project-access@1.26.4

## 0.3.8

### Patch Changes

-   Updated dependencies [88c8bf6]
    -   @sap-ux/project-access@1.26.3

## 0.3.7

### Patch Changes

-   e69db46: Upgrade fast-xml-parser
-   Updated dependencies [e69db46]
    -   @sap-ux/project-access@1.26.2

## 0.3.6

### Patch Changes

-   Updated dependencies [a986655]
    -   @sap-ux/project-access@1.26.1

## 0.3.5

### Patch Changes

-   Updated dependencies [518bf7e]
    -   @sap-ux/project-access@1.26.0

## 0.3.4

### Patch Changes

-   Updated dependencies [99b7b5f]
    -   @sap-ux/project-access@1.25.8

## 0.3.3

### Patch Changes

-   Updated dependencies [d549173]
    -   @sap-ux/project-access@1.25.7

## 0.3.2

### Patch Changes

-   Updated dependencies [a9fac04]
    -   @sap-ux/project-access@1.25.6

## 0.3.1

### Patch Changes

-   Updated dependencies [421f3ca]
    -   @sap-ux/project-access@1.25.5

## 0.3.0

### Minor Changes

-   5b243ac: Add `projectType` mandatory option to `App` interface to specify the type of project being processed. This option determines file inclusion/exclusion and script updates in the template:
    -   For projects of type 'CAPJava' or 'CAPNodejs':
        -   Exclude `ui5-local.yaml` and `.gitignore` from the template.
        -   Update `package.json` to include only the script `deploy-config`.
        -   Use full URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.
    -   For projects of type 'EDMXBackend':
        -   Include `ui5-local.yaml` and `.gitignore` in the template.
        -   Update `package.json` to include the following scripts: start, start-local, build, start-noflp, start-mock, int-test, deploy, and sap-ux.
        -   Include relative URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.

## 0.2.6

### Patch Changes

-   Updated dependencies [173b5f2]
    -   @sap-ux/project-access@1.25.4

## 0.2.5

### Patch Changes

-   Updated dependencies [e7b9184]
    -   @sap-ux/project-access@1.25.3

## 0.2.4

### Patch Changes

-   @sap-ux/project-access@1.25.2

## 0.2.3

### Patch Changes

-   Updated dependencies [0f3cf6b]
    -   @sap-ux/project-access@1.25.1

## 0.2.2

### Patch Changes

-   Updated dependencies [f076dd3]
    -   @sap-ux/project-access@1.25.0

## 0.2.1

### Patch Changes

-   Updated dependencies [0ae685e]
    -   @sap-ux/project-access@1.24.0

## 0.2.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

-   Updated dependencies [c2359077]
    -   @sap-ux/project-access@1.23.0

## 0.1.2

### Patch Changes

-   bb7ebe9a: Fix: Include Templates in 'files' Array of fiori-generator-shared Package.json

## 0.1.1

### Patch Changes

-   Updated dependencies [9ea58ad4]
    -   @sap-ux/project-access@1.22.4

## 0.1.0

### Minor Changes

-   3b795703: Adding generate readme file functionalities

## 0.0.17

### Patch Changes

-   @sap-ux/project-access@1.22.3

## 0.0.16

### Patch Changes

-   Updated dependencies [399d2ad8]
    -   @sap-ux/project-access@1.22.2

## 0.0.15

### Patch Changes

-   @sap-ux/project-access@1.22.1

## 0.0.14

### Patch Changes

-   Updated dependencies [ad93a484]
    -   @sap-ux/project-access@1.22.0

## 0.0.13

### Patch Changes

-   @sap-ux/project-access@1.21.2

## 0.0.12

### Patch Changes

-   @sap-ux/project-access@1.21.1

## 0.0.11

### Patch Changes

-   Updated dependencies [69b8d6de]
    -   @sap-ux/project-access@1.21.0

## 0.0.10

### Patch Changes

-   Updated dependencies [a7d78229]
    -   @sap-ux/project-access@1.20.4

## 0.0.9

### Patch Changes

-   @sap-ux/project-access@1.20.3

## 0.0.8

### Patch Changes

-   Updated dependencies [54c91c6d]
    -   @sap-ux/project-access@1.20.2

## 0.0.7

### Patch Changes

-   @sap-ux/project-access@1.20.1

## 0.0.6

### Patch Changes

-   Updated dependencies [e3d2324c]
    -   @sap-ux/project-access@1.20.0

## 0.0.5

### Patch Changes

-   @sap-ux/project-access@1.19.14

## 0.0.4

### Patch Changes

-   Updated dependencies [99bca62c]
    -   @sap-ux/project-access@1.19.13

## 0.0.3

### Patch Changes

-   Updated dependencies [b7d95fb3]
    -   @sap-ux/project-access@1.19.12

## 0.0.2

### Patch Changes

-   Updated dependencies [4389c528]
    -   @sap-ux/project-access@1.19.11

## 0.0.1

### Patch Changes

-   58538723: adds new module @sap-ux/fiori-generator-shared
