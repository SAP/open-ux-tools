# @sap-ux/axios-extension

## 1.11.0

### Minor Changes

-   0f6e0e1b: Checks if an ABAP target system is on premise to log additional info when deploying.
    Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
    So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

### Patch Changes

-   Updated dependencies [0f6e0e1b]
    -   @sap-ux/btp-utils@0.14.0

## 1.10.2

### Patch Changes

-   64f9c513: adds more concise logging of error from xml response

## 1.10.1

### Patch Changes

-   Updated dependencies [2e0b1a6d]
    -   @sap-ux/logger@0.5.0

## 1.10.0

### Minor Changes

-   ecd5275d: fix log info order, remove showAddInfo

## 1.9.0

### Minor Changes

-   de8a4878: Checks if an ABAP target system is on premise to log additional info when deploying.
    Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
    So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

### Patch Changes

-   Updated dependencies [de8a4878]
    -   @sap-ux/btp-utils@0.13.0

## 1.8.1

### Patch Changes

-   3000e8f4: adds additional log for deployment

## 1.8.0

### Minor Changes

-   62232236: Use token for connecting to ABAP Cloud

## 1.7.3

### Patch Changes

-   286883cb: fix(deps): update dependency axios to v1.6.0 [security]
-   Updated dependencies [286883cb]
    -   @sap-ux/btp-utils@0.12.1

## 1.7.2

### Patch Changes

-   db918804: App name with namespace (e.g. /NS/APPNAME) needs to be URI encoded in the UI% ABAP repository delete service request URL.

## 1.7.1

### Patch Changes

-   fa4537b2: cleanup how baseURL is used to deteremine if the service is created with a destination

## 1.7.0

### Minor Changes

-   aa2ff95b: Enhanced LREP and UI5_ABAP_REPO services to support deployment of adaptation projects

## 1.6.1

### Patch Changes

-   3cfaba52: Apply additional logging if the endpoint is a destination

## 1.6.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

-   Updated dependencies [1aa0fc43]
    -   @sap-ux/btp-utils@0.12.0
    -   @sap-ux/logger@0.4.0

## 1.5.1

### Patch Changes

-   Updated dependencies [4052822f]
    -   @sap-ux/logger@0.3.9

## 1.5.0

### Minor Changes

-   d7492b53: Instead of returning empty array, `TransportChecksService.getTransportRequests()` now throws a specific error if input package is a local package. Consumer can check if
    the error message string equals `TransportChecksService.LocalPackageError`. This fix is to correctly identify
    local package because non-local package that is not associated with any transport request can also return emtpy array.

## 1.4.8

### Patch Changes

-   0760c9f8: Support UAA credentials if available

## 1.4.7

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build
-   Updated dependencies [63c698a8]
    -   @sap-ux/btp-utils@0.11.9
    -   @sap-ux/logger@0.3.8

## 1.4.6

### Patch Changes

-   7b156515: fix(deps): update dependency xpath to v0.0.33

## 1.4.5

### Patch Changes

-   01fa690e: fix(deps): update dependency @xmldom/xmldom to v0.8.10

## 1.4.4

### Patch Changes

-   676f8ba0: Note for customer to replace url with destination url.

## 1.4.3

### Patch Changes

-   6e403f27: fix(deps): update dependency fast-xml-parser to v4.2.7

## 1.4.2

### Patch Changes

-   29e71f68: Remove unnecessary uri encoding on the package name within ADT service query implementation `getTransportRequests`.

## 1.4.1

### Patch Changes

-   24e45780: Updated dependency: axios@1.4.0
-   Updated dependencies [24e45780]
    -   @sap-ux/btp-utils@0.11.8

## 1.4.0

### Minor Changes

-   d2fd9a58: Enhanced LREP service to support merging of app descriptor variants

## 1.3.6

### Patch Changes

-   23059e62: log longtext_url as clickable link

## 1.3.5

### Patch Changes

-   69b88bcc: TransportChecksService API method `getTransportRequests` now encodes the packageName within its implementation.

## 1.3.4

### Patch Changes

-   da6fbb04: remove trailing slash from uaa url

## 1.3.3

### Patch Changes

-   1599efac: encode app name for tr requests

## 1.3.2

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
-   Updated dependencies [4ba13898]
    -   @sap-ux/btp-utils@0.11.7
    -   @sap-ux/logger@0.3.7

## 1.3.1

### Patch Changes

-   d9355692: Upgrade vulnerable modules semver and fast-xml-parser

## 1.3.0

### Minor Changes

-   42dc7395: handle btp uaa credentials

## 1.2.8

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues
-   Updated dependencies [25911701]
    -   @sap-ux/btp-utils@0.11.6
    -   @sap-ux/logger@0.3.6

## 1.2.7

### Patch Changes

-   e4f9748b: Upgrade vulnerable module fast-xml-parser

## 1.2.6

### Patch Changes

-   2d279633: handle 401 for undeployment

## 1.2.5

### Patch Changes

-   aeb4cd83: handle entry severity in logging

## 1.2.4

### Patch Changes

-   aeba5509: Better error logging when test mode is enabled

## 1.2.3

### Patch Changes

-   31eb27c4: Only eject the fetch request interceptor when a valid csrf token is received

## 1.2.2

### Patch Changes

-   fa94bfd6: Only eject the fetch request interceptor when a valid csrf token is received

## 1.2.1

### Patch Changes

-   3d3d8c64: Fixes for unsage usage of optional chaining sonar bugs

## 1.2.0

### Minor Changes

-   c775d787: This change implements a new ADT service `FileStoreService`.
    `FileStoreService` supports querying the file structure and file content in a deployed Fiori app archive.

    Example use case:

    ```
    const fileStoreService = await provider.getAdtService<FileStoreService>(FileStoreService);
    // Fetch a list of files and folders in the app's root folder.
    const rootFolderContent = await fileStoreService.getAppArchiveContent('folder' 'ZFIORIAPP');
    // Fetch a list of files and folders in <root>/webapp
    const webappFolderContent = await fileStoreService.getAppArchiveContent('folder' 'ZFIORIAPP', '/webapp');
    // Fetch the text content as string from <root>/package.json file.
    const fileContent = await fileStoreService.getAppArchiveContent('file' 'ZFIORIAPP', '/package.json');
    ```

## 1.1.0

### Minor Changes

-   0fa9c31e: Show destination URL property as public facing URL

## 1.0.3

### Patch Changes

-   7fd2810: improved logging

## 1.0.2

### Patch Changes

-   8e059ae: consider segment parameters in service uri

## 1.0.1

### Patch Changes

-   d350038: chore - TypeScript 4.9.4 upgrade
-   Updated dependencies [d350038]
    -   @sap-ux/logger@0.3.5
    -   @sap-ux/btp-utils@0.11.5

## 1.0.0

### Major Changes

-   77ac998: Added a new AdtService class: ListPackageService. It provides API function
    `listPackages({maxResult: number, phrase: string})` which returns all existing package names that
    has prefix matching input parameter `phrase`.

    ```javascript
    const listPackageService = (await provider.getAdtService) < ListPackageService > ListPackageService;
    const packages = await listPackageService.listPackages({ maxResult: 50, phrase: 'Z_' });
    ```

## 0.14.1

### Patch Changes

-   ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
-   Updated dependencies [ed04f6f]
    -   @sap-ux/btp-utils@0.11.4
    -   @sap-ux/logger@0.3.4

## 0.14.0

### Minor Changes

-   3748963: minor bug fix

## 0.13.4

### Patch Changes

-   Updated dependencies [c6f4c8c]
    -   @sap-ux/logger@0.3.3

## 0.13.3

### Patch Changes

-   b727719: chore(open-ux-tools) upgrade @xmldom/xmldom

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
