# @sap-ux/deploy-tooling

## 0.14.6

### Patch Changes

-   Updated dependencies [ec509c40]
    -   @sap-ux/ui5-config@0.22.0
    -   @sap-ux/axios-extension@1.11.3
    -   @sap-ux/system-access@0.3.17

## 0.14.5

### Patch Changes

-   @sap-ux/system-access@0.3.17

## 0.14.4

### Patch Changes

-   Updated dependencies [1affcec6]
    -   @sap-ux/project-input-validator@0.2.3

## 0.14.3

### Patch Changes

-   Updated dependencies [811c4324]
    -   @sap-ux/btp-utils@0.14.2
    -   @sap-ux/axios-extension@1.11.3
    -   @sap-ux/system-access@0.3.16

## 0.14.2

### Patch Changes

-   c15435b6: fix: remove engines pnpm from package.json
-   Updated dependencies [c15435b6]
    -   @sap-ux/project-input-validator@0.2.2
    -   @sap-ux/axios-extension@1.11.2
    -   @sap-ux/system-access@0.3.15
    -   @sap-ux/ui5-config@0.21.1
    -   @sap-ux/btp-utils@0.14.1
    -   @sap-ux/logger@0.5.1

## 0.14.1

### Patch Changes

-   Updated dependencies [efd2f6d4]
    -   @sap-ux/axios-extension@1.11.1
    -   @sap-ux/system-access@0.3.14

## 0.14.0

### Minor Changes

-   0f6e0e1b: Checks if an ABAP target system is on premise to log additional info when deploying.
    Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
    So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

### Patch Changes

-   Updated dependencies [0f6e0e1b]
    -   @sap-ux/axios-extension@1.11.0
    -   @sap-ux/btp-utils@0.14.0
    -   @sap-ux/system-access@0.3.13

## 0.13.4

### Patch Changes

-   Updated dependencies [64f9c513]
    -   @sap-ux/axios-extension@1.10.2
    -   @sap-ux/system-access@0.3.12

## 0.13.3

### Patch Changes

-   Updated dependencies [2e0b1a6d]
    -   @sap-ux/logger@0.5.0
    -   @sap-ux/axios-extension@1.10.1
    -   @sap-ux/system-access@0.3.11

## 0.13.2

### Patch Changes

-   2bedc697: chore(deps): update dependency @types/adm-zip to v0.5.5

## 0.13.1

### Patch Changes

-   @sap-ux/system-access@0.3.10

## 0.13.0

### Minor Changes

-   ecd5275d: fix log info order, remove showAddInfo

### Patch Changes

-   Updated dependencies [ecd5275d]
    -   @sap-ux/axios-extension@1.10.0
    -   @sap-ux/system-access@0.3.9

## 0.12.0

### Minor Changes

-   de8a4878: Checks if an ABAP target system is on premise to log additional info when deploying.
    Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
    So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

### Patch Changes

-   Updated dependencies [de8a4878]
    -   @sap-ux/axios-extension@1.9.0
    -   @sap-ux/btp-utils@0.13.0
    -   @sap-ux/system-access@0.3.8

## 0.11.10

### Patch Changes

-   Updated dependencies [3000e8f4]
    -   @sap-ux/axios-extension@1.8.1
    -   @sap-ux/system-access@0.3.7

## 0.11.9

### Patch Changes

-   Updated dependencies [62232236]
    -   @sap-ux/axios-extension@1.8.0
    -   @sap-ux/system-access@0.3.6

## 0.11.8

### Patch Changes

-   Updated dependencies [3f977f21]
    -   @sap-ux/ui5-config@0.21.0
    -   @sap-ux/axios-extension@1.7.3
    -   @sap-ux/system-access@0.3.5

## 0.11.7

### Patch Changes

-   286883cb: fix(deps): update dependency axios to v1.6.0 [security]
-   Updated dependencies [286883cb]
    -   @sap-ux/axios-extension@1.7.3
    -   @sap-ux/btp-utils@0.12.1
    -   @sap-ux/system-access@0.3.5

## 0.11.6

### Patch Changes

-   58d48e13: Capitalize $tmp before performing any validations. ADT queries rejects package name that is not in capital letter.
    The previous fix only caplitalize for list package query. But ADT query for valid transport requests also require
    caplized capital letters to detect $TMP is local package.
-   Updated dependencies [db918804]
    -   @sap-ux/axios-extension@1.7.2
    -   @sap-ux/system-access@0.3.4

## 0.11.5

### Patch Changes

-   d0e46a5c: Do not validate url if destination is present
-   Updated dependencies [d0e46a5c]
    -   @sap-ux/project-input-validator@0.2.1

## 0.11.4

### Patch Changes

-   70bf0627: When validation result is successful, the successful log messages should still be printed on the console.

## 0.11.3

### Patch Changes

-   Updated dependencies [d31cfeff]
    -   @sap-ux/project-input-validator@0.2.0

## 0.11.2

### Patch Changes

-   Updated dependencies [fa4537b2]
    -   @sap-ux/axios-extension@1.7.1
    -   @sap-ux/system-access@0.3.3

## 0.11.1

### Patch Changes

-   4568e82b: Ensure provider is updated with credentials after 401 is returned

## 0.11.0

### Minor Changes

-   e0e9bd9e: Support for deployment of adaptation projects to LREP.

## 0.10.2

### Patch Changes

-   aa2ff95b: Replaced yazl with adm-zip
-   Updated dependencies [aa2ff95b]
    -   @sap-ux/axios-extension@1.7.0
    -   @sap-ux/system-access@0.3.2

## 0.10.1

### Patch Changes

-   Updated dependencies [3cfaba52]
    -   @sap-ux/axios-extension@1.6.1
    -   @sap-ux/system-access@0.3.1

## 0.10.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

-   Updated dependencies [1aa0fc43]
    -   @sap-ux/axios-extension@1.6.0
    -   @sap-ux/system-access@0.3.0
    -   @sap-ux/ui5-config@0.20.0
    -   @sap-ux/btp-utils@0.12.0
    -   @sap-ux/logger@0.4.0

## 0.9.20

### Patch Changes

-   966b396b: - Improve format of reported invalid messages
    -   Convert $tmp to upper case to pass ADT validation
-   Updated dependencies [966b396b]
    -   @sap-ux/project-input-validator@0.1.2

## 0.9.19

### Patch Changes

-   Updated dependencies [cbcad88d]
    -   @sap-ux/project-input-validator@0.1.1
    -   @sap-ux/system-access@0.2.11

## 0.9.18

### Patch Changes

-   Updated dependencies [4052822f]
    -   @sap-ux/logger@0.3.9
    -   @sap-ux/axios-extension@1.5.1
    -   @sap-ux/system-access@0.2.10
    -   @sap-ux/ui5-config@0.19.5

## 0.9.17

### Patch Changes

-   d7492b53: A new feature is introduced to run validators on deploy configuration in `ui5-deploy.yaml` and returns found issues. This new feature is only activated when running deploy in the existing `test` mode. No additional parameter required to include this validation process.
-   Updated dependencies [d7492b53]
-   Updated dependencies [d7492b53]
    -   @sap-ux/axios-extension@1.5.0
    -   @sap-ux/project-input-validator@0.1.0
    -   @sap-ux/system-access@0.2.9

## 0.9.16

### Patch Changes

-   Updated dependencies [65010b09]
    -   @sap-ux/ui5-config@0.19.4
    -   @sap-ux/axios-extension@1.4.8
    -   @sap-ux/system-access@0.2.8

## 0.9.15

### Patch Changes

-   Updated dependencies [0760c9f8]
    -   @sap-ux/axios-extension@1.4.8
    -   @sap-ux/system-access@0.2.8

## 0.9.14

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build
-   Updated dependencies [63c698a8]
    -   @sap-ux/axios-extension@1.4.7
    -   @sap-ux/btp-utils@0.11.9
    -   @sap-ux/logger@0.3.8
    -   @sap-ux/system-access@0.2.7
    -   @sap-ux/ui5-config@0.19.3

## 0.9.13

### Patch Changes

-   Updated dependencies [7b156515]
    -   @sap-ux/axios-extension@1.4.6
    -   @sap-ux/system-access@0.2.6

## 0.9.12

### Patch Changes

-   Updated dependencies [01fa690e]
-   Updated dependencies [3137514f]
    -   @sap-ux/axios-extension@1.4.5
    -   @sap-ux/ui5-config@0.19.2
    -   @sap-ux/system-access@0.2.5

## 0.9.11

### Patch Changes

-   @sap-ux/system-access@0.2.4

## 0.9.10

### Patch Changes

-   Updated dependencies [7c8a6946]
    -   @sap-ux/ui5-config@0.19.1
    -   @sap-ux/axios-extension@1.4.4
    -   @sap-ux/system-access@0.2.3

## 0.9.9

### Patch Changes

-   Updated dependencies [676f8ba0]
    -   @sap-ux/axios-extension@1.4.4
    -   @sap-ux/system-access@0.2.3

## 0.9.8

### Patch Changes

-   Updated dependencies [6e403f27]
    -   @sap-ux/axios-extension@1.4.3
    -   @sap-ux/system-access@0.2.2

## 0.9.7

### Patch Changes

-   Updated dependencies [29e71f68]
    -   @sap-ux/axios-extension@1.4.2
    -   @sap-ux/system-access@0.2.1

## 0.9.6

### Patch Changes

-   30a7f6ae: apply exclude param when generating archive zip

## 0.9.5

### Patch Changes

-   Updated dependencies [290b6b59]
    -   @sap-ux/system-access@0.2.0

## 0.9.4

### Patch Changes

-   Updated dependencies [375ca861]
    -   @sap-ux/ui5-config@0.19.0
    -   @sap-ux/axios-extension@1.4.1

## 0.9.3

### Patch Changes

-   24e45780: Updated dependency: axios@1.4.0
-   Updated dependencies [24e45780]
    -   @sap-ux/axios-extension@1.4.1
    -   @sap-ux/btp-utils@0.11.8

## 0.9.2

### Patch Changes

-   517c6ae9: Load dotenv when UI5 task is called

## 0.9.1

### Patch Changes

-   91bee893: Destination CLI param should support username CLI param

## 0.9.0

### Minor Changes

-   61939ec4: remove logs and fix 401 error handling

## 0.8.0

### Minor Changes

-   19cf13b2: enable create transport param for undeployment

## 0.7.2

### Patch Changes

-   523510a2: update uaa params for 401 errors

## 0.7.1

### Patch Changes

-   1fa8b879: fix issue cloud target systems

## 0.7.0

### Minor Changes

-   f159d02b: handle toggling of strict-ssl

## 0.6.0

### Minor Changes

-   b1a2e3a9: exposes function and adds param to create transport requests

## 0.5.0

### Minor Changes

-   3fb2d5c4: support cli credentials

## 0.4.5

### Patch Changes

-   Updated dependencies [d2fd9a58]
    -   @sap-ux/axios-extension@1.4.0

## 0.4.4

### Patch Changes

-   Updated dependencies [23059e62]
    -   @sap-ux/axios-extension@1.3.6

## 0.4.3

### Patch Changes

-   Updated dependencies [69b88bcc]
    -   @sap-ux/axios-extension@1.3.5

## 0.4.2

### Patch Changes

-   da6fbb04: remove trailing slash from uaa url
-   Updated dependencies [da6fbb04]
    -   @sap-ux/axios-extension@1.3.4

## 0.4.1

### Patch Changes

-   891bbe4e: improve error handling for abap service provider

## 0.4.0

### Minor Changes

-   7acea374: support service parameter

## 0.3.4

### Patch Changes

-   Updated dependencies [1599efac]
    -   @sap-ux/axios-extension@1.3.3

## 0.3.3

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
-   Updated dependencies [4ba13898]
    -   @sap-ux/axios-extension@1.3.2
    -   @sap-ux/ui5-config@0.18.2
    -   @sap-ux/btp-utils@0.11.7
    -   @sap-ux/logger@0.3.7
    -   @sap-ux/store@0.3.12

## 0.3.2

### Patch Changes

-   Updated dependencies [d9355692]
    -   @sap-ux/axios-extension@1.3.1
    -   @sap-ux/ui5-config@0.18.1

## 0.3.1

### Patch Changes

-   Updated dependencies [59863d93]
    -   @sap-ux/ui5-config@0.18.0

## 0.3.0

### Minor Changes

-   42dc7395: handle btp uaa credentials

### Patch Changes

-   Updated dependencies [42dc7395]
    -   @sap-ux/axios-extension@1.3.0

## 0.2.12

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues
-   Updated dependencies [25911701]
    -   @sap-ux/axios-extension@1.2.8
    -   @sap-ux/btp-utils@0.11.6
    -   @sap-ux/logger@0.3.6
    -   @sap-ux/store@0.3.11
    -   @sap-ux/ui5-config@0.17.1

## 0.2.11

### Patch Changes

-   e4f9748b: Upgrade vulnerable module fast-xml-parser
-   Updated dependencies [e4f9748b]
    -   @sap-ux/axios-extension@1.2.7

## 0.2.10

### Patch Changes

-   2d279633: handle 401 for undeployment
-   Updated dependencies [2d279633]
    -   @sap-ux/axios-extension@1.2.6

## 0.2.9

### Patch Changes

-   Updated dependencies [31207b95]
    -   @sap-ux/ui5-config@0.17.0

## 0.2.8

### Patch Changes

-   Updated dependencies [aeb4cd83]
    -   @sap-ux/axios-extension@1.2.5

## 0.2.7

### Patch Changes

-   c1dcb9d4: Cleanup archive.zip name

## 0.2.6

### Patch Changes

-   Updated dependencies [aeba5509]
    -   @sap-ux/axios-extension@1.2.4

## 0.2.5

### Patch Changes

-   31eb27c4: Only eject the fetch request interceptor when a valid csrf token is received
-   Updated dependencies [31eb27c4]
    -   @sap-ux/axios-extension@1.2.3

## 0.2.4

### Patch Changes

-   100248f3: fix(security): upgrade yaml
-   Updated dependencies [100248f3]
    -   @sap-ux/ui5-config@0.16.6

## 0.2.3

### Patch Changes

-   fa94bfd6: Only eject the fetch request interceptor when a valid csrf token is received
-   Updated dependencies [fa94bfd6]
    -   @sap-ux/axios-extension@1.2.2

## 0.2.2

### Patch Changes

-   Updated dependencies [3d3d8c64]
    -   @sap-ux/axios-extension@1.2.1

## 0.2.1

### Patch Changes

-   Updated dependencies [c775d787]
    -   @sap-ux/axios-extension@1.2.0

## 0.2.0

### Minor Changes

-   0fa9c31e: Show destination URL property as public facing URL

### Patch Changes

-   Updated dependencies [0fa9c31e]
    -   @sap-ux/axios-extension@1.1.0

## 0.1.1

### Patch Changes

-   Updated dependencies [e7614e5]
    -   @sap-ux/ui5-config@0.16.5

## 0.1.0

### Minor Changes

-   7fd2810: Initial version of the deploy tooling

### Patch Changes

-   Updated dependencies [7fd2810]
    -   @sap-ux/axios-extension@1.0.3
