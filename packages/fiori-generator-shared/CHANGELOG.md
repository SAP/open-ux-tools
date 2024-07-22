# @sap-ux/fiori-generator-shared

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
