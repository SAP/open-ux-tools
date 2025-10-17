# @sap-ux/axios-extension

## 1.23.0

### Minor Changes

-   bacaf93: Connections to Abap cloud will always use re-entrance tickets instead of UAA/OAuth2

### Patch Changes

-   Updated dependencies [bacaf93]
    -   @sap-ux/feature-toggle@0.3.2

## 1.22.10

### Patch Changes

-   43a2446: chore: fix Sonar issues
-   Updated dependencies [43a2446]
    -   @sap-ux/btp-utils@1.1.4

## 1.22.9

### Patch Changes

-   Updated dependencies [998954b]
    -   @sap-ux/btp-utils@1.1.3

## 1.22.8

### Patch Changes

-   9872384: Upgrade axios module
-   Updated dependencies [9872384]
    -   @sap-ux/btp-utils@1.1.2

## 1.22.7

### Patch Changes

-   Updated dependencies [04d2103]
    -   @sap-ux/feature-toggle@0.3.1

## 1.22.6

### Patch Changes

-   4cfebaf: Update axios module
-   Updated dependencies [4cfebaf]
    -   @sap-ux/btp-utils@1.1.1

## 1.22.5

### Patch Changes

-   9f10a60: Use `ZLOCAL` to determine local packages and multiple minor bug fixes

## 1.22.4

### Patch Changes

-   ffac61c: Improved performance of v4 catalog service loading

## 1.22.3

### Patch Changes

-   f9ea9e3: feat: Enhance ADP FLP configuration generator

## 1.22.2

### Patch Changes

-   14214a3: Cleanup documentation

## 1.22.1

### Patch Changes

-   a9f1808: Disable proxy for BAS

## 1.22.0

### Minor Changes

-   aaf0c14: support rap service generation

## 1.21.4

### Patch Changes

-   b45093b: Revert toggle, required to support BAS CLI flows

## 1.21.3

### Patch Changes

-   4303f99: fix(axios): Disable System info params encoding

## 1.21.2

### Patch Changes

-   61d4060: use accept header for service generator content request from config

## 1.21.1

### Patch Changes

-   2224d63: Remove feature toggle, required to enable HTTPS proxy configurations

## 1.21.0

### Minor Changes

-   a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

-   Updated dependencies [a28357d]
    -   @sap-ux/feature-toggle@0.3.0
    -   @sap-ux/btp-utils@1.1.0
    -   @sap-ux/logger@0.7.0

## 1.20.3

### Patch Changes

-   Updated dependencies [5585f0d]
    -   @sap-ux/feature-toggle@0.2.4

## 1.20.2

### Patch Changes

-   1a01c5e: Update README.adoc showing how to use proxy credentials

## 1.20.1

### Patch Changes

-   a3a43b2: Append warning message if the BSP properties do not match the deployed BSP properties

## 1.20.0

### Minor Changes

-   28c6594: Added a new sub-generator: `@sap-ux/repo-app-download-sub-generator` to support downloading ABAP deployed Fiori apps from the repository. Enhanced `@sap-ux/axios-extension` to support Base64 download data.

## 1.19.3

### Patch Changes

-   Updated dependencies [d638daa]
    -   @sap-ux/btp-utils@1.0.3

## 1.19.2

### Patch Changes

-   ced5edf: feat(generator-adp): Create a yeoman package for Adaptation Project generator

## 1.19.1

### Patch Changes

-   011c8c5: fix(deps): update dependency axios to v1.8.2 [security]
-   Updated dependencies [011c8c5]
    -   @sap-ux/btp-utils@1.0.2

## 1.19.0

### Minor Changes

-   aaa432a: Export patchTls from `sap-ux/axios-extension`

## 1.18.6

### Patch Changes

-   4fd3029: Allow using an alias for the reentrance url

## 1.18.5

### Patch Changes

-   Updated dependencies [65f15d9]
    -   @sap-ux/btp-utils@1.0.1

## 1.18.4

### Patch Changes

-   Updated dependencies [9980073]
    -   @sap-ux/btp-utils@1.0.0

## 1.18.3

### Patch Changes

-   Updated dependencies [df2d965]
    -   @sap-ux/btp-utils@0.18.0

## 1.18.2

### Patch Changes

-   e516306: Handle partial deployment timeout by updating repo on second retry when timeout occurs.

## 1.18.1

### Patch Changes

-   1559aee: add entry for s4 hana cloud urls with .lab

## 1.18.0

### Minor Changes

-   2e3c15e: Proper check for cloud ABAP systems

## 1.17.8

### Patch Changes

-   Updated dependencies [cb54b44]
    -   @sap-ux/btp-utils@0.17.2

## 1.17.7

### Patch Changes

-   727fd86: Fix v4 odata services not paged

## 1.17.6

### Patch Changes

-   Updated dependencies [2359524]
    -   @sap-ux/btp-utils@0.17.1

## 1.17.5

### Patch Changes

-   Updated dependencies [d04a40e]
    -   @sap-ux/feature-toggle@0.2.3

## 1.17.4

### Patch Changes

-   Updated dependencies [a62ff25]
    -   @sap-ux/btp-utils@0.17.0

## 1.17.3

### Patch Changes

-   8237f83: feat: add namespaces to annotation template

## 1.17.2

### Patch Changes

-   Updated dependencies [3734fe8]
    -   @sap-ux/btp-utils@0.16.0

## 1.17.1

### Patch Changes

-   7551316: Small text cleanups

## 1.17.0

### Minor Changes

-   0120dda: Handle HTTP(S) proxy configurations

## 1.16.7

### Patch Changes

-   9bda640: CPE loading changes from backend and not from workspace

## 1.16.6

### Patch Changes

-   aa72f3c: Fix preview adp project with component dependencies

## 1.16.5

### Patch Changes

-   Updated dependencies [d3dafeb]
    -   @sap-ux/btp-utils@0.15.2

## 1.16.4

### Patch Changes

-   9c8dc5c: fix: update `axios` to `1.7.4`
-   Updated dependencies [9c8dc5c]
    -   @sap-ux/btp-utils@0.15.1

## 1.16.3

### Patch Changes

-   0084205: linting: use optional chaining operator ?

## 1.16.2

### Patch Changes

-   e69db46: Upgrade fast-xml-parser

## 1.16.1

### Patch Changes

-   ad9b56d: Extend axios-extension services

## 1.16.0

### Minor Changes

-   3a878f3: Add support for abap cds view service generation

## 1.15.1

### Patch Changes

-   abf491a7: add service type to catalog request results

## 1.15.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

-   Updated dependencies [c2359077]
    -   @sap-ux/btp-utils@0.15.0
    -   @sap-ux/logger@0.6.0

## 1.14.4

### Patch Changes

-   4492fe10: fix for ui service generation response parsing

## 1.14.3

### Patch Changes

-   d5d3626c: chore - Update to "qs": "6.11.0"

## 1.14.2

### Patch Changes

-   65bfb244: Add Adaptation Project's Change Data Source generator prompting

## 1.14.1

### Patch Changes

-   844e79c4: fix for v2 catalog services

## 1.14.0

### Minor Changes

-   31cc53f8: Use new api endpoint for ui service generator

## 1.13.1

### Patch Changes

-   869c1c0d: Prevents overwriting axios config params

## 1.13.0

### Minor Changes

-   b2ee99fc: Updates how service specific annotations are requested

## 1.12.6

### Patch Changes

-   558891c2: cleanup logging statment

## 1.12.5

### Patch Changes

-   69282b7d: add cookies for embedded steampunk service providers

## 1.12.4

### Patch Changes

-   6e3d4da4: Add config needed in BAS

## 1.12.3

### Patch Changes

-   19ec0f01: FIX: corrected scenario ID for S/4HANA Cloud Public Edition 2408 and onward

## 1.12.2

### Patch Changes

-   a41bbd95: Use correct param in business object request, add new exports

## 1.12.1

### Patch Changes

-   1b5f7442: feat(axios-extension): Add PATH to debug output

## 1.12.0

### Minor Changes

-   312919ec: Add new adt services for ui service generation and publish

## 1.11.9

### Patch Changes

-   Updated dependencies [9a32e102]
    -   @sap-ux/btp-utils@0.14.4

## 1.11.8

### Patch Changes

-   56b77fd9: fix: isS4Cloud returned wrong value when checking a development client

## 1.11.7

### Patch Changes

-   31f5027c: Rename SCENARIO to FIORI_TOOLS_SCENARIO

## 1.11.6

### Patch Changes

-   080e7b06: enhance lrep log messages

## 1.11.5

### Patch Changes

-   1db4c60c: FIX: use correct url for reentrance tickets and enhance config to support it

## 1.11.4

### Patch Changes

-   61b46bc8: Security upgrade fixes
-   Updated dependencies [61b46bc8]
    -   @sap-ux/btp-utils@0.14.3

## 1.11.3

### Patch Changes

-   Updated dependencies [811c4324]
    -   @sap-ux/btp-utils@0.14.2

## 1.11.2

### Patch Changes

-   c15435b6: fix: remove engines pnpm from package.json
-   Updated dependencies [c15435b6]
    -   @sap-ux/btp-utils@0.14.1
    -   @sap-ux/logger@0.5.1

## 1.11.1

### Patch Changes

-   efd2f6d4: Support ui5 version 1.71.\* in CPE.

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
