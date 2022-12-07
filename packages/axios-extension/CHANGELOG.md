# @sap-ux/axios-extension

## 0.13.2

### Patch Changes

-   5589854: Upgrade qs module and the modules using it because of a potential Denial of Service vulnerabity

## 0.13.1

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
-   Updated dependencies [070d8dc]
    -   @sap-ux/btp-utils@0.11.3
    -   @sap-ux/logger@0.3.2

## 0.13.0

### Minor Changes

-   9b9b3d7: - Changed TransportRequestService implementation and API for creating new transport request number.
    -   New TransportRequestService API now requires two extra input parameters `packageName` and `appName`.

## 0.12.0

### Minor Changes

-   116ff5e: Changing API for deployment to be more flexible for different consumer use cases

## 0.11.1

### Patch Changes

-   703dc96: Upgrade @xmldom/xmldom dependency to fix security vulnerability CVE-2022-39353

## 0.11.0

### Minor Changes

-   f4ab2cd: - Added ADT service for create transport request
    -   Modified API to query ADT service. Now ADT services are obtained by calling the following getAdtService() method. E.g.
        const transportRequestSerivce = abapServiceProvider.getAdtService<TransportRequestService>(TransportRequestService);
        transportRequestSerivce.getTransportRequestList(...);
    -   Modified API for AbapServiceProvider APIs:
        ui5AbapRepository() > getUi5AbapRepository()
        appIndex() > getAppIndex()
        layeredRepository() > getLayeredRepository()

## 0.10.3

### Patch Changes

-   f3cbe4d: Remove dependency to i18n libraries in Yaml module

## 0.10.2

### Patch Changes

-   9820cef: Upgrade @xmldom/xmldom dependency to fix security vulnerability CVE-2022-37616

## 0.10.1

### Patch Changes

-   5b487ef: chore - Apply linting to test folders and linting fixes
-   Updated dependencies [5b487ef]
    -   @sap-ux/btp-utils@0.11.2
    -   @sap-ux/logger@0.3.1

## 0.10.0

### Minor Changes

-   8778cbd: Change API of ADT request getTransportRequests to return transport req metadata associated with transport numbers

## 0.9.8

### Patch Changes

-   fac7a5a: Replaced usage of express with simple code to reduce installation size.

## 0.9.7

### Patch Changes

-   b8d5315: Relaxing interfaces when working with destinations.
-   Updated dependencies [b8d5315]
    -   @sap-ux/btp-utils@0.11.1

## 0.9.6

### Patch Changes

-   12e4686: Fix handling of special characters in xml encode deployment payload

## 0.9.5

### Patch Changes

-   Updated dependencies [bc4cb3a]
    -   @sap-ux/btp-utils@0.11.0
    -   @sap-ux/logger@0.3.0

## 0.9.4

### Patch Changes

-   2896b77: Fixed incorrect url parameter

## 0.9.3

### Patch Changes

-   4342e1a: Fix: incorrect error thrown catalog service

## 0.9.2

### Patch Changes

-   d7b3e4f: Fixed issues with fetching annotations based on a service path

## 0.9.1

### Patch Changes

-   Updated dependencies [5710cfa]
    -   @sap-ux/btp-utils@0.10.4

## 0.9.0

### Minor Changes

-   49dcf36: Supports establishing abap connection from existing cookies without auth.

## 0.8.1

### Patch Changes

-   09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
-   Updated dependencies [09c6eb5]
    -   @sap-ux/btp-utils@0.10.3
    -   @sap-ux/logger@0.2.2

## 0.8.0

### Minor Changes

-   732171b: ADT service support in abap service provider

## 0.7.2

### Patch Changes

-   cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
-   Updated dependencies [cc1c406]
    -   @sap-ux/btp-utils@0.10.2
    -   @sap-ux/logger@0.2.1

## 0.7.1

### Patch Changes

-   Updated dependencies [6f0f217]
    -   @sap-ux/btp-utils@0.10.1

## 0.7.0

### Minor Changes

-   6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

-   Updated dependencies [6f51973]
    -   @sap-ux/btp-utils@0.10.0
    -   @sap-ux/logger@0.2.0

## 0.6.0

### Minor Changes

-   9864fb5: Add support for login with reentrance tickets

## 0.5.2

### Patch Changes

-   c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
-   Updated dependencies [c70fd4d]
    -   @sap-ux/btp-utils@0.9.2
    -   @sap-ux/logger@0.1.6

## 0.5.1

### Patch Changes

-   Updated dependencies [815bf59]
    -   @sap-ux/btp-utils@0.9.1

## 0.5.0

### Minor Changes

-   439b9d0: Added abstraction for LREP service

## 0.4.0

### Minor Changes

-   9967c5f: Initial release of reusable modules for system access.

### Patch Changes

-   Updated dependencies [9967c5f]
    -   @sap-ux/btp-utils@0.9.0
