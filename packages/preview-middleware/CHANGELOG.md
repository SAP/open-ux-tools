# @sap-ux/preview-middleware

## 1.0.33

### Patch Changes

#### Workspace Updates

- @sap-ux/adp-tooling 1.0.23 → 1.0.24

## 1.0.32

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.3 → 2.1.4
- @sap-ux/adp-tooling 1.0.22 → 1.0.23
- @sap-ux/system-access 1.0.4 → 1.0.4

## 1.0.31

### Patch Changes

#### Workspace Updates

- @sap-ux/adp-tooling 1.0.21 → 1.0.22

## 1.0.30

### Patch Changes

#### Dependency Updates

- Upgrade patch-level dependencies [[aed328d](https://github.com/SAP/open-ux-tools/commit/aed328da8a5c93e226c58e4d7dc14c7c82756259)]

#### Workspace Updates

- @sap-ux/feature-toggle 1.0.2 → 1.0.3
- @sap-ux/system-access 1.0.3 → 1.0.4
- @sap-ux/adp-tooling 1.0.20 → 1.0.21
- @sap-ux/btp-utils 2.0.2 → 2.0.3

## 1.0.29

### Patch Changes

#### Release Date

2026-06-25

#### Bug Fixes

- Use findCapProjectRoot instead of findProjectRoot for reliable CAP project type detection when app is started from a subfolder [[86daa87](https://github.com/SAP/open-ux-tools/commit/86daa87d8f9376ef3e109562caa91cee8572b9e7)]

## 1.0.28

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.2 → 2.1.3
- @sap-ux/adp-tooling 1.0.19 → 1.0.20
- @sap-ux/system-access 1.0.3 → 1.0.3

## 1.0.27

### Patch Changes

#### Workspace Updates

- @sap-ux/adp-tooling 1.0.18 → 1.0.19

## 1.0.26

## 1.0.25

### Patch Changes

#### Workspace Updates

- @sap-ux/adp-tooling 1.0.17 → 1.0.18

## 1.0.24

### Patch Changes

#### Workspace Updates

- @sap-ux/adp-tooling 1.0.16 → 1.0.17

## 1.0.23

### Patch Changes

#### Release Date

2026-06-15

#### Bug Fixes

- add min UI5 version to readme for card generator feature [[d6846ea](https://github.com/SAP/open-ux-tools/commit/d6846ead37edc1b80c1f8857bf30be4ef19f4c45)]

## 1.0.22

_Released: 2026-06-14T10:40:09Z_

### Patch Changes

- adae40d: fix: restore LocalStorageConnector for non-ADP projects

    PR #4122 removed LocalStorageConnector globally but it should only be omitted for adaptation projects (ADP). Non-ADP Fiori projects still need the connector for local variant storage on CUSTOMER/USER layers.

- Updated dependencies [adae40d]
    - @sap-ux/adp-tooling@1.0.16

## 1.0.21

_Released: 2026-06-12T19:01:39Z_

### Patch Changes

- 00ddb82: feat: adjust default pattern for OPA5 journey collection

## 1.0.20

_Released: 2026-06-12T14:48:41Z_

### Patch Changes

- d4e24a7: fix: add min UI5 version check to card generator endpoint

## 1.0.19

_Released: 2026-06-12T10:49:08Z_

### Patch Changes

- 6f3b596: fix: (Adaptation Editor) FL Variant changes do not appear in the unsaved changes list (history panel).
- Updated dependencies [6e4a71a]
    - @sap-ux/adp-tooling@1.0.15

## 1.0.18

_Released: 2026-06-12T08:50:00Z_

### Patch Changes

- 0110219: fix regression writing wrong manifest path via the changes created via properties panel and remove unused control-property-editor-common code

## 1.0.17

_Released: 2026-06-12T06:53:23Z_

### Patch Changes

- Updated dependencies [41b3908]
    - @sap-ux/feature-toggle@1.0.2
    - @sap-ux/adp-tooling@1.0.14
    - @sap-ux/system-access@1.0.3

## 1.0.16

_Released: 2026-06-11T13:37:16Z_

### Patch Changes

- Updated dependencies [e66a8a9]
    - @sap-ux/adp-tooling@1.0.13

## 1.0.15

_Released: 2026-06-11T10:54:17Z_

### Patch Changes

- @sap-ux/adp-tooling@1.0.12

## 1.0.14

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- Updated dependencies [c8e8f7e]
    - @sap-ux/adp-tooling@1.0.11
    - @sap-ux/project-access@2.1.2
    - @sap-ux/system-access@1.0.2

## 1.0.13

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- Updated dependencies [0fa8305]
    - @sap-ux/btp-utils@2.0.2
    - @sap-ux/adp-tooling@1.0.10
    - @sap-ux/system-access@1.0.2

## 1.0.12

_Released: 2026-06-09T13:18:16Z_

### Patch Changes

- @sap-ux/adp-tooling@1.0.9

## 1.0.11

_Released: 2026-06-09T09:41:14Z_

### Patch Changes

- bcfe9e3: Fix: Inconsistent property naming between RTA and CPE

## 1.0.10

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/adp-tooling@1.0.8
    - @sap-ux/system-access@1.0.1

## 1.0.9

_Released: 2026-06-04T12:10:05Z_

### Patch Changes

- Updated dependencies [fb84c0e]
    - @sap-ux/adp-tooling@1.0.7

## 1.0.8

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/adp-tooling@1.0.6
    - @sap-ux/system-access@1.0.1

## 1.0.7

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/feature-toggle@1.0.1
    - @sap-ux/project-access@2.0.3
    - @sap-ux/system-access@1.0.1
    - @sap-ux/adp-tooling@1.0.5
    - @sap-ux/btp-utils@2.0.1
    - @sap-ux/logger@1.0.1
    - @sap-ux/i18n@1.0.1

## 1.0.6

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/adp-tooling@1.0.4
- @sap-ux/project-access@2.0.2
- @sap-ux/system-access@1.0.0

## 1.0.5

_Released: 2026-06-02T21:37:28Z_

### Patch Changes

- 3506d2c: fix: i18n translations not loading after ESM migration

## 1.0.4

_Released: 2026-06-02T11:35:17Z_

### Patch Changes

- @sap-ux/adp-tooling@1.0.3

## 1.0.3

_Released: 2026-06-02T08:56:31Z_

### Patch Changes

- Updated dependencies [a8e4cf0]
    - @sap-ux/adp-tooling@1.0.2

## 1.0.2

_Released: 2026-06-01T17:22:37Z_

### Patch Changes

- 8024912: fix: republish to pick up control-property-editor 1.0.1 (1.0.0 was unpublished from npm)

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/adp-tooling@1.0.1
    - @sap-ux/system-access@1.0.0

## 1.0.0

_Released: 2026-05-30T20:54:07Z_

### Major Changes

- 32609a7: # Migration to ECMAScript Modules (ESM)

    Packages in the SAP Open UX Tools monorepo have been migrated from CommonJS (CJS) to ECMAScript Modules (ESM) with NodeNext module resolution.

    '@sap-ux/backend-proxy-middleware-cf' is experimental and will remain at major version 0.
    '@sap-ux/generator-odata-downloader' is a top level yeoman generator and will remain as CJS until validation as ESM is done.

    ## What Changed
    - **Module System**: Most packages now use native ESM (`"type": "module"` in package.json)
    - **TypeScript Configuration**: Updated to `module: "NodeNext"` and `moduleResolution: "NodeNext"`
    - **Import Statements**: All relative imports now include explicit `.js` extensions (per ESM spec)
    - **Build Output**: Generated JavaScript files are now ESM modules
    - **Node.js Requirement**: Minimum Node.js version remains >=22.x

    ### Jest Configuration (for Testing)

    If your project tests code that imports these packages, update your Jest configuration:

    ```js
    export default {
        extensionsToTreatAsEsm: ['.ts'],
        transform: {
            '^.+\\.ts$': ['ts-jest', { useESM: true }]
        }
    };
    ```

    And run Jest with: `NODE_OPTIONS='--experimental-vm-modules' jest`

### Patch Changes

- Updated dependencies [32609a7]
    - @sap-ux/feature-toggle@1.0.0
    - @sap-ux/project-access@2.0.0
    - @sap-ux/system-access@1.0.0
    - @sap-ux/adp-tooling@1.0.0
    - @sap-ux/btp-utils@2.0.0
    - @sap-ux/logger@1.0.0
    - @sap-ux/i18n@1.0.0

## 0.26.12

_Released: 2026-05-29T12:50:34Z_

### Patch Changes

- @sap-ux/adp-tooling@0.19.11

## 0.26.11

_Released: 2026-05-29T06:59:27Z_

### Patch Changes

- 9a980a9: fix: Prioritize local workspace fragments over deployed versions in adaptation project editor

    When previewing an adaptation project connected to an ABAP system, locally created fragments and controllers are now correctly prioritized over their deployed counterparts. The LREP flex data response from the ABAP system includes inlined module content (fragment XMLs, controller JS) which prevented UI5 from requesting local workspace versions. The fix strips these inlined modules from the response so that UI5 falls back to HTTP requests, which the existing ADP proxy serves from the local workspace. Flex changes are left untouched as UI5 deduplicates them natively by fileName.

- Updated dependencies [9a980a9]
    - @sap-ux/adp-tooling@0.19.10

## 0.26.10

_Released: 2026-05-27T11:39:21Z_

### Patch Changes

- @sap-ux/adp-tooling@0.19.9

## 0.26.9

_Released: 2026-05-27T10:42:47Z_

### Patch Changes

- @sap-ux/adp-tooling@0.19.8
- @sap-ux/system-access@0.8.2

## 0.26.8

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- 01b70ca: chore: upgrade @sap/service-provider-apis 2.8.0 → 2.10.0 (security: axios vulnerability)
- Updated dependencies [01b70ca]
    - @sap-ux/adp-tooling@0.19.7
    - @sap-ux/btp-utils@1.2.1
    - @sap-ux/system-access@0.8.1

## 0.26.7

_Released: 2026-05-22T13:30:05Z_

### Patch Changes

- Updated dependencies [758b0d4]
    - @sap-ux/adp-tooling@0.19.6

## 0.26.6

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/adp-tooling@0.19.5
- @sap-ux/project-access@1.38.1
- @sap-ux/system-access@0.8.0

## 0.26.5

_Released: 2026-05-21T14:58:44Z_

### Patch Changes

- Updated dependencies [dab1aa2]
    - @sap-ux/adp-tooling@0.19.4

## 0.26.4

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/adp-tooling@0.19.3
    - @sap-ux/system-access@0.8.0

## 0.26.3

_Released: 2026-05-18T08:15:14Z_

### Patch Changes

- Updated dependencies [342c544]
    - @sap-ux/adp-tooling@0.19.2

## 0.26.2

_Released: 2026-05-15T20:38:24Z_

### Patch Changes

- fb00faa: fix(ci): use workspace:\* for internal monorepo dependencies

## 0.26.1

_Released: 2026-05-15T13:12:06Z_

### Patch Changes

- Updated dependencies [2c76f8f]
    - @sap-ux/adp-tooling@0.19.1

## 0.26.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/adp-tooling@0.19.0
    - @sap-ux/btp-utils@1.2.0
    - @sap-ux/feature-toggle@0.4.0
    - @sap-ux/i18n@0.4.0
    - @sap-ux/logger@0.9.0
    - @sap-ux/project-access@1.37.0
    - @sap-ux/system-access@0.8.0

## 0.25.47

_Released: 2026-05-14T21:28:41Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.134

## 0.25.46

_Released: 2026-05-14T14:16:50Z_

### Patch Changes

- Updated dependencies [8c4185a]
    - @sap-ux/adp-tooling@0.18.133

## 0.25.45

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/adp-tooling@0.18.132
    - @sap-ux/btp-utils@1.1.16
    - @sap-ux/feature-toggle@0.3.9
    - @sap-ux/i18n@0.3.12
    - @sap-ux/logger@0.8.6
    - @sap-ux/project-access@1.36.5
    - @sap-ux/system-access@0.7.13

## 0.25.44

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/adp-tooling@0.18.131
    - @sap-ux/system-access@0.7.12

## 0.25.43

_Released: 2026-05-12T18:00:39Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.130

## 0.25.42

_Released: 2026-05-12T07:58:27Z_

### Patch Changes

- be5476f: feat: Display unhandled exceptions from the Controller extension inside the Info Center.

## 0.25.41

_Released: 2026-05-11T08:53:48Z_

### Patch Changes

- 17de742: fix: Add fragment list to model for custom fragments

## 0.25.40

_Released: 2026-05-07T07:06:42Z_

## 0.25.39

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- Updated dependencies [678a08e]
- Updated dependencies [678a08e]
    - @sap-ux/adp-tooling@0.18.129
    - @sap-ux/btp-utils@1.1.15
    - @sap-ux/system-access@0.7.11
    - @sap-ux/project-access@1.36.3

## 0.25.38

_Released: 2026-05-04T08:49:55Z_

## 0.25.37

_Released: 2026-05-01T15:46:09Z_

### Patch Changes

- Updated dependencies [b2ffc7e]
    - @sap-ux/adp-tooling@0.18.128

## 0.25.36

_Released: 2026-04-30T19:47:20Z_

### Patch Changes

- Updated dependencies [fcaa70c]
    - @sap-ux/adp-tooling@0.18.127

## 0.25.35

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/system-access@0.7.10
    - @sap-ux/adp-tooling@0.18.126
    - @sap-ux/i18n@0.3.11
    - @sap-ux/project-access@1.36.2

## 0.25.34

_Released: 2026-04-30T13:10:33Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.125

## 0.25.33

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/adp-tooling@0.18.124
    - @sap-ux/system-access@0.7.9

## 0.25.32

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/adp-tooling@0.18.123
    - @sap-ux/system-access@0.7.8

## 0.25.31

_Released: 2026-04-27T15:50:47Z_

## 0.25.30

_Released: 2026-04-27T07:30:24Z_

### Patch Changes

- Updated dependencies [10847a1]
    - @sap-ux/adp-tooling@0.18.122

## 0.25.29

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21
    - @sap-ux/adp-tooling@0.18.121
    - @sap-ux/system-access@0.7.8

## 0.25.28

_Released: 2026-04-23T06:48:55Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.120
- @sap-ux/system-access@0.7.8

## 0.25.27

_Released: 2026-04-22T12:38:46Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.119

## 0.25.26

_Released: 2026-04-15T11:53:17Z_

### Patch Changes

- 67d1f8b: Bump dotenv and configure "quiet" option
- Updated dependencies [67d1f8b]
    - @sap-ux/adp-tooling@0.18.118

## 0.25.25

_Released: 2026-04-15T08:11:32Z_

### Patch Changes

- Updated dependencies [8fb08a2]
    - @sap-ux/adp-tooling@0.18.117

## 0.25.24

_Released: 2026-04-14T20:26:28Z_

### Patch Changes

- ee68603: Axios upgrade from bas-sdk
- Updated dependencies [ee68603]
    - @sap-ux/btp-utils@1.1.14
    - @sap-ux/adp-tooling@0.18.116
    - @sap-ux/system-access@0.7.7

## 0.25.23

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/adp-tooling@0.18.115
    - @sap-ux/btp-utils@1.1.13
    - @sap-ux/system-access@0.7.6
    - @sap-ux/project-access@1.35.20

## 0.25.22

_Released: 2026-04-14T11:39:16Z_

### Patch Changes

- Updated dependencies [497317c]
    - @sap-ux/adp-tooling@0.18.114

## 0.25.21

_Released: 2026-04-09T11:02:11Z_

## 0.25.20

_Released: 2026-04-09T07:00:16Z_

### Patch Changes

- Updated dependencies [7a8613b]
    - @sap-ux/adp-tooling@0.18.113

## 0.25.19

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/logger@0.8.5
    - @sap-ux/adp-tooling@0.18.112
    - @sap-ux/system-access@0.7.5
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/project-access@1.35.19

## 0.25.18

_Released: 2026-04-07T11:09:34Z_

### Patch Changes

- Updated dependencies [1b10e9f]
    - @sap-ux/adp-tooling@0.18.111

## 0.25.17

_Released: 2026-04-06T06:37:05Z_

### Patch Changes

- 4237e59: fix(preview-middleware): preserve developerMode for CPE and ADP scenarios in sanitizeConfig

## 0.25.16

_Released: 2026-04-01T14:51:40Z_

### Patch Changes

- Updated dependencies [6b74074]
    - @sap-ux/adp-tooling@0.18.110

## 0.25.15

_Released: 2026-04-01T13:59:33Z_

### Patch Changes

- 0153757: fix: RTA editor endpoint causing duplicate ID error if started from the launchpad sandbox

## 0.25.14

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/adp-tooling@0.18.109
    - @sap-ux/system-access@0.7.4

## 0.25.13

_Released: 2026-04-01T06:34:51Z_

### Patch Changes

- Updated dependencies [68b5523]
    - @sap-ux/adp-tooling@0.18.108

## 0.25.12

_Released: 2026-03-31T06:45:29Z_

### Patch Changes

- f305285: fix: sanitize cards generator manifest URL to avoid issues with double slashes when joining paths

## 0.25.11

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
    - @sap-ux/adp-tooling@0.18.107
    - @sap-ux/feature-toggle@0.3.8
    - @sap-ux/logger@0.8.4
    - @sap-ux/system-access@0.7.4
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/project-access@1.35.17

## 0.25.10

_Released: 2026-03-30T14:18:57Z_

### Patch Changes

- 8408e10: enhancedHomePage - initialize cdm before bootstrap

## 0.25.9

_Released: 2026-03-27T15:37:24Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.106

## 0.25.8

_Released: 2026-03-27T12:51:40Z_

### Patch Changes

- 3013bf0: fix: i18n configuration handling for CAP projects

## 0.25.7

_Released: 2026-03-27T11:58:49Z_

### Patch Changes

- Updated dependencies [2e17a6b]
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/adp-tooling@0.18.105
    - @sap-ux/system-access@0.7.3

## 0.25.6

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/adp-tooling@0.18.104
    - @sap-ux/system-access@0.7.2

## 0.25.5

_Released: 2026-03-26T16:48:32Z_

### Patch Changes

- Updated dependencies [96a689b]
    - @sap-ux/adp-tooling@0.18.103

## 0.25.4

_Released: 2026-03-26T16:10:41Z_

### Patch Changes

- 8e7d529: fix(preview-middleware): ADP Extension Points: blank iframe on reload for UI5 < 1.120

## 0.25.3

_Released: 2026-03-26T15:15:10Z_

### Patch Changes

- Updated dependencies [3dcd3f7]
    - @sap-ux/adp-tooling@0.18.102

## 0.25.2

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: fix(preview-middleware): cast ParsedQs to Record<string,string> for URLSearchParams (stricter @types/qs 6.15)
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/adp-tooling@0.18.101
    - @sap-ux/btp-utils@1.1.11
    - @sap-ux/i18n@0.3.10
    - @sap-ux/logger@0.8.3
    - @sap-ux/project-access@1.35.16
    - @sap-ux/system-access@0.7.2

## 0.25.1

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/adp-tooling@0.18.100
    - @sap-ux/system-access@0.7.1

## 0.25.0

_Released: 2026-03-24T10:27:55Z_

### Minor Changes

- 997f605: fix: adjust resource-roots for rta editor endpoints

## 0.24.6

_Released: 2026-03-23T18:25:40Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.99
- @sap-ux/system-access@0.7.1

## 0.24.5

_Released: 2026-03-23T10:51:10Z_

### Patch Changes

- Updated dependencies [2cd2544]
    - @sap-ux/adp-tooling@0.18.98

## 0.24.4

_Released: 2026-03-20T16:53:08Z_

### Patch Changes

- 55eb5dc: fix: disable condensing in workspace connector for older SAPUI5 versions

## 0.24.3

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- Updated dependencies [25e5177]
    - @sap-ux/system-access@0.7.0
    - @sap-ux/adp-tooling@0.18.97
    - @sap-ux/project-access@1.35.14

## 0.24.2

_Released: 2026-03-18T16:51:44Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.96

## 0.24.1

_Released: 2026-03-18T15:22:00Z_

### Patch Changes

- Updated dependencies [4f86250]
    - @sap-ux/adp-tooling@0.18.95

## 0.24.0

_Released: 2026-03-17T14:06:05Z_

### Minor Changes

- 428ee72: fix: Rename action missing for Object Page elements in Adaptation Editor. Annotation changes are now explicitly disabled as they are not supported in developer mode.

## 0.23.156

_Released: 2026-03-17T08:35:25Z_

### Patch Changes

- 3626b55: fix: Add New Card flow broken for OVP adaptation projects
- Updated dependencies [3626b55]
    - @sap-ux/adp-tooling@0.18.94

## 0.23.155

_Released: 2026-03-17T07:55:04Z_

### Patch Changes

- Updated dependencies [a854433]
    - @sap-ux/adp-tooling@0.18.93
    - @sap-ux/system-access@0.6.66

## 0.23.154

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 5d452e5: fix(deps): update dependency nock to v14
- Updated dependencies [5d452e5]
- Updated dependencies [55417bb]
    - @sap-ux/adp-tooling@0.18.92
    - @sap-ux/btp-utils@1.1.10
    - @sap-ux/system-access@0.6.65

## 0.23.153

_Released: 2026-03-13T07:45:50Z_

### Patch Changes

- Updated dependencies [53af342]
    - @sap-ux/adp-tooling@0.18.91

## 0.23.152

_Released: 2026-03-12T14:39:47Z_

### Patch Changes

- 0453fe5: fix: ensure leading slash for preview paths

## 0.23.151

_Released: 2026-03-10T13:28:49Z_

### Patch Changes

- 05f3f4c: fix: Various ADP Generator fixes for CF flow
- Updated dependencies [05f3f4c]
    - @sap-ux/adp-tooling@0.18.90

## 0.23.150

_Released: 2026-03-06T13:19:33Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.89

## 0.23.149

_Released: 2026-03-06T10:26:32Z_

### Patch Changes

- Updated dependencies [f14a3d1]
    - @sap-ux/adp-tooling@0.18.88

## 0.23.148

_Released: 2026-03-05T23:21:37Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.87
- @sap-ux/system-access@0.6.64

## 0.23.147

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/adp-tooling@0.18.86
    - @sap-ux/system-access@0.6.63

## 0.23.146

_Released: 2026-03-05T15:09:36Z_

### Patch Changes

- Updated dependencies [5d458c7]
    - @sap-ux/adp-tooling@0.18.85

## 0.23.145

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- fdd57de: fix(deps): update dependency dotenv to v17
- Updated dependencies [7c06ef0]
- Updated dependencies [83ca0e9]
- Updated dependencies [fdd57de]
    - @sap-ux/project-access@1.35.12
    - @sap-ux/adp-tooling@0.18.84
    - @sap-ux/system-access@0.6.63

## 0.23.144

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.83

## 0.23.143

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- Updated dependencies [f5f9a78]
- Updated dependencies [45d4797]
    - @sap-ux/adp-tooling@0.18.82
    - @sap-ux/logger@0.8.2
    - @sap-ux/btp-utils@1.1.9
    - @sap-ux/project-access@1.35.11
    - @sap-ux/system-access@0.6.62

## 0.23.142

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.81
- @sap-ux/system-access@0.6.61

## 0.23.141

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- Updated dependencies [c09b843]
    - @sap-ux/adp-tooling@0.18.80
    - @sap-ux/project-access@1.35.11
    - @sap-ux/system-access@0.6.60

## 0.23.140

_Released: 2026-03-04T11:03:29Z_

### Patch Changes

- Updated dependencies [2d42592]
    - @sap-ux/adp-tooling@0.18.79

## 0.23.139

_Released: 2026-03-03T08:27:12Z_

### Patch Changes

- Updated dependencies [4af92b5]
    - @sap-ux/adp-tooling@0.18.78
    - @sap-ux/system-access@0.6.60

## 0.23.138

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/adp-tooling@0.18.77
    - @sap-ux/system-access@0.6.59

## 0.23.137

_Released: 2026-02-27T08:51:24Z_

### Patch Changes

- b68b558: Fix card generator endpoints using wrong paths for CAP projects.

## 0.23.136

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- Updated dependencies [6c993f3]
    - @sap-ux/adp-tooling@0.18.76
    - @sap-ux/system-access@0.6.58

## 0.23.135

_Released: 2026-02-25T14:21:41Z_

### Patch Changes

- ed1399d: Fix: Change custom column creation in v4 from addXML to appDescr change
- Updated dependencies [ed1399d]
    - @sap-ux/adp-tooling@0.18.75

## 0.23.134

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- c043712: fix(deps): update dependency supertest to v7.2.2
- Updated dependencies [fd8de2b]
- Updated dependencies [c043712]
    - @sap-ux/i18n@0.3.9
    - @sap-ux/adp-tooling@0.18.74
    - @sap-ux/project-access@1.35.9
    - @sap-ux/system-access@0.6.57

## 0.23.133

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- cc1c422: fix(deps): update dependency npm-run-all2 to v8
- Updated dependencies [0ecc5f1]
- Updated dependencies [cc1c422]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/i18n@0.3.8
    - @sap-ux/adp-tooling@0.18.73
    - @sap-ux/system-access@0.6.56

## 0.23.132

_Released: 2026-02-23T15:13:48Z_

### Patch Changes

- Updated dependencies [ce9f074]
    - @sap-ux/adp-tooling@0.18.72

## 0.23.131

_Released: 2026-02-23T12:45:04Z_

### Patch Changes

- 34b8293: fix: add cards generator path to CAP index.html

## 0.23.130

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.71
- @sap-ux/project-access@1.35.7
- @sap-ux/system-access@0.6.56

## 0.23.129

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- Updated dependencies [d588c26]
    - @sap-ux/adp-tooling@0.18.70
    - @sap-ux/feature-toggle@0.3.7
    - @sap-ux/system-access@0.6.56

## 0.23.128

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- Updated dependencies [cbd340a]
    - @sap-ux/adp-tooling@0.18.69
    - @sap-ux/system-access@0.6.55

## 0.23.127

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6
    - @sap-ux/adp-tooling@0.18.68
    - @sap-ux/system-access@0.6.54

## 0.23.126

_Released: 2026-02-20T11:22:50Z_

### Patch Changes

- Updated dependencies [d1b13c4]
    - @sap-ux/adp-tooling@0.18.67

## 0.23.125

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/adp-tooling@0.18.66
    - @sap-ux/system-access@0.6.54

## 0.23.124

_Released: 2026-02-18T10:31:10Z_

### Patch Changes

- 227e704: Fix detection of sap.fe.macros.Table for newer UI5 versions.

## 0.23.123

_Released: 2026-02-18T07:50:55Z_

### Patch Changes

- 849529f: fix: Missing additional info for adaptation projects with local IDs

## 0.23.122

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- dd2131c: Axios upgrade from bas-sdk
- Updated dependencies [dd2131c]
    - @sap-ux/btp-utils@1.1.9
    - @sap-ux/adp-tooling@0.18.65
    - @sap-ux/system-access@0.6.53

## 0.23.121

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- e7f58d7: (ADP) Introduce Private Cloud feature
- Updated dependencies [e7f58d7]
    - @sap-ux/adp-tooling@0.18.64
    - @sap-ux/system-access@0.6.52
    - @sap-ux/project-access@1.35.4

## 0.23.120

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.63
- @sap-ux/system-access@0.6.51

## 0.23.119

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/adp-tooling@0.18.62
    - @sap-ux/project-access@1.35.3
    - @sap-ux/system-access@0.6.50

## 0.23.118

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/adp-tooling@0.18.61
    - @sap-ux/system-access@0.6.50

## 0.23.117

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/adp-tooling@0.18.60
    - @sap-ux/btp-utils@1.1.8
    - @sap-ux/system-access@0.6.50
    - @sap-ux/project-access@1.35.1

## 0.23.116

_Released: 2026-02-09T15:13:41Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.59

## 0.23.115

_Released: 2026-02-09T13:27:34Z_

### Patch Changes

- 40989a9: fix: Extension points under node 'element' not listed in Outline

## 0.23.114

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0
    - @sap-ux/adp-tooling@0.18.58
    - @sap-ux/system-access@0.6.49

## 0.23.113

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/adp-tooling@0.18.57
    - @sap-ux/system-access@0.6.49

## 0.23.112

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.56
- @sap-ux/system-access@0.6.49

## 0.23.111

_Released: 2026-02-05T13:02:56Z_

### Patch Changes

- Updated dependencies [df61c3a]
    - @sap-ux/adp-tooling@0.18.55

## 0.23.110

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.54
- @sap-ux/system-access@0.6.48

## 0.23.109

_Released: 2026-02-05T09:48:57Z_

### Patch Changes

- Updated dependencies [8a56942]
    - @sap-ux/adp-tooling@0.18.53

## 0.23.108

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6
    - @sap-ux/adp-tooling@0.18.52
    - @sap-ux/system-access@0.6.47

## 0.23.107

_Released: 2026-02-05T06:48:22Z_

### Patch Changes

- f1e6ed6: fix: Incorrect Adaptation Project configuration for Cloud Foundry projects
- Updated dependencies [f1e6ed6]
    - @sap-ux/adp-tooling@0.18.51

## 0.23.106

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- 9f11dd2: chore - address audit issues
- Updated dependencies [9f11dd2]
    - @sap-ux/feature-toggle@0.3.6
    - @sap-ux/system-access@0.6.47
    - @sap-ux/adp-tooling@0.18.50
    - @sap-ux/btp-utils@1.1.7

## 0.23.105

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/adp-tooling@0.18.49
    - @sap-ux/system-access@0.6.46

## 0.23.104

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/logger@0.8.1
    - @sap-ux/adp-tooling@0.18.48
    - @sap-ux/system-access@0.6.45
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/project-access@1.34.4

## 0.23.103

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3
    - @sap-ux/adp-tooling@0.18.47
    - @sap-ux/system-access@0.6.44

## 0.23.102

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.46
- @sap-ux/system-access@0.6.44

## 0.23.101

_Released: 2026-01-27T12:14:20Z_

### Patch Changes

- af8d6b8: fix: change table action creation for v4 from addXML to app descriptor change

## 0.23.100

_Released: 2026-01-26T14:35:00Z_

### Patch Changes

- c061595: fix: support rta and cpe for CAP node w/o mockserver

## 0.23.99

_Released: 2026-01-26T09:14:13Z_

### Patch Changes

- Updated dependencies [0492325]
    - @sap-ux/adp-tooling@0.18.45
    - @sap-ux/system-access@0.6.43

## 0.23.98

_Released: 2026-01-23T23:57:30Z_

### Patch Changes

- c707af1: fix(deps): update dependency dotenv to v16.6.1
- Updated dependencies [c707af1]
    - @sap-ux/adp-tooling@0.18.44

## 0.23.97

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- Updated dependencies [d11943d]
    - @sap-ux/adp-tooling@0.18.43

## 0.23.96

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.42
- @sap-ux/system-access@0.6.42

## 0.23.95

_Released: 2026-01-22T12:07:29Z_

### Patch Changes

- 1970178: Fix: Switch Page Action creation for OData V4 from addXML to appDescriptor based

## 0.23.94

_Released: 2026-01-19T12:47:48Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.41

## 0.23.93

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2
    - @sap-ux/adp-tooling@0.18.40
    - @sap-ux/system-access@0.6.41

## 0.23.92

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.39
- @sap-ux/system-access@0.6.41

## 0.23.91

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/adp-tooling@0.18.38
    - @sap-ux/system-access@0.6.40

## 0.23.90

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/adp-tooling@0.18.37
    - @sap-ux/system-access@0.6.40

## 0.23.89

_Released: 2026-01-14T13:30:42Z_

### Patch Changes

- ce4b29c: Upgrade qs/body-parser/express
- Updated dependencies [ce4b29c]
    - @sap-ux/adp-tooling@0.18.36

## 0.23.88

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2
    - @sap-ux/adp-tooling@0.18.35
    - @sap-ux/system-access@0.6.40

## 0.23.87

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/project-access@1.33.1
    - @sap-ux/adp-tooling@0.18.34
    - @sap-ux/system-access@0.6.40

## 0.23.86

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.33
- @sap-ux/system-access@0.6.39

## 0.23.85

_Released: 2026-01-07T16:03:58Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.32
- @sap-ux/system-access@0.6.38

## 0.23.84

_Released: 2026-01-07T10:20:40Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.31

## 0.23.83

_Released: 2026-01-06T14:37:31Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.30

## 0.23.82

_Released: 2026-01-05T14:16:22Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.29

## 0.23.81

_Released: 2025-12-23T12:18:51Z_

### Patch Changes

- e81640f: fix: custom init

## 0.23.80

_Released: 2025-12-22T17:36:43Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.28
- @sap-ux/system-access@0.6.37

## 0.23.79

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0
    - @sap-ux/project-access@1.33.0
    - @sap-ux/adp-tooling@0.18.27
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/system-access@0.6.36

## 0.23.78

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/project-access@1.32.17
    - @sap-ux/system-access@0.6.35
    - @sap-ux/adp-tooling@0.18.26
    - @sap-ux/logger@0.7.3
    - @sap-ux/i18n@0.3.7
    - @sap-ux/btp-utils@1.1.6

## 0.23.77

_Released: 2025-12-18T13:13:52Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.25

## 0.23.76

_Released: 2025-12-18T08:56:52Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.24
- @sap-ux/system-access@0.6.34

## 0.23.75

_Released: 2025-12-17T13:45:40Z_

### Patch Changes

- Updated dependencies [a79eb1b]
    - @sap-ux/adp-tooling@0.18.23

## 0.23.74

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- Updated dependencies [ba58398]
    - @sap-ux/system-access@0.6.33
    - @sap-ux/adp-tooling@0.18.22

## 0.23.73

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/feature-toggle@0.3.5
    - @sap-ux/project-access@1.32.16
    - @sap-ux/system-access@0.6.32
    - @sap-ux/adp-tooling@0.18.21
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/logger@0.7.2
    - @sap-ux/i18n@0.3.6

## 0.23.72

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15
    - @sap-ux/adp-tooling@0.18.20
    - @sap-ux/system-access@0.6.31

## 0.23.71

_Released: 2025-12-12T09:02:37Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.19

## 0.23.70

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14
    - @sap-ux/adp-tooling@0.18.18
    - @sap-ux/system-access@0.6.31

## 0.23.69

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- 985223a: fix loading i18n bundle for CAP projects
- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13
    - @sap-ux/adp-tooling@0.18.17
    - @sap-ux/system-access@0.6.31

## 0.23.68

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- 037a430: fix high severity Sonar issues
- Updated dependencies [037a430]
    - @sap-ux/system-access@0.6.31
    - @sap-ux/adp-tooling@0.18.16

## 0.23.67

_Released: 2025-12-08T11:51:00Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.15
- @sap-ux/system-access@0.6.30

## 0.23.66

_Released: 2025-12-05T12:18:49Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.14

## 0.23.65

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12
    - @sap-ux/adp-tooling@0.18.13
    - @sap-ux/system-access@0.6.29

## 0.23.64

_Released: 2025-12-04T07:10:48Z_

### Patch Changes

- 324d8ed: feat: Enable Adaptation Editor for CF projects
- Updated dependencies [324d8ed]
    - @sap-ux/adp-tooling@0.18.12

## 0.23.63

_Released: 2025-11-28T13:51:14Z_

### Patch Changes

- Updated dependencies [9c66de4]
    - @sap-ux/adp-tooling@0.18.11

## 0.23.62

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11
    - @sap-ux/adp-tooling@0.18.10
    - @sap-ux/system-access@0.6.29

## 0.23.61

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.9
- @sap-ux/system-access@0.6.29
- @sap-ux/project-access@1.32.10

## 0.23.60

_Released: 2025-11-26T12:17:21Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.8

## 0.23.59

_Released: 2025-11-26T00:12:42Z_

### Patch Changes

- @sap-ux/adp-tooling@0.18.7

## 0.23.58

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9
    - @sap-ux/adp-tooling@0.18.6
    - @sap-ux/system-access@0.6.28

## 0.23.57

_Released: 2025-11-21T15:52:30Z_

### Patch Changes

- Updated dependencies [6872b31]
    - @sap-ux/adp-tooling@0.18.5

## 0.23.56

_Released: 2025-11-20T16:33:02Z_

### Patch Changes

- d37ad9b: fix: adjust fallback UI5 version

## 0.23.55

_Released: 2025-11-18T12:29:09Z_

### Patch Changes

- 5475b5b: Store fragment parent control info in fragment body
- Updated dependencies [5475b5b]
    - @sap-ux/adp-tooling@0.18.4

## 0.23.54

_Released: 2025-11-12T16:47:06Z_

### Patch Changes

- Updated dependencies [744fa93]
    - @sap-ux/adp-tooling@0.18.3

## 0.23.53

_Released: 2025-11-12T13:11:21Z_

### Patch Changes

- Updated dependencies [92ec778]
    - @sap-ux/adp-tooling@0.18.2

## 0.23.52

_Released: 2025-11-12T08:08:16Z_

### Patch Changes

- Updated dependencies [3017ce7]
    - @sap-ux/adp-tooling@0.18.1

## 0.23.51

_Released: 2025-11-10T14:56:50Z_

### Patch Changes

- Updated dependencies [aa2c7df]
    - @sap-ux/adp-tooling@0.18.0

## 0.23.50

_Released: 2025-11-07T13:23:57Z_

### Patch Changes

- @sap-ux/adp-tooling@0.17.8

## 0.23.49

_Released: 2025-11-07T10:42:49Z_

### Patch Changes

- 81c99f9: chore - upgrade ui5 devDeps

## 0.23.48

_Released: 2025-11-06T15:12:51Z_

### Patch Changes

- @sap-ux/adp-tooling@0.17.7

## 0.23.47

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/feature-toggle@0.3.4
    - @sap-ux/project-access@1.32.8
    - @sap-ux/system-access@0.6.28
    - @sap-ux/adp-tooling@0.17.6
    - @sap-ux/btp-utils@1.1.5
    - @sap-ux/logger@0.7.1
    - @sap-ux/i18n@0.3.5

## 0.23.46

_Released: 2025-11-04T05:14:45Z_

### Patch Changes

- db63f7b: fix(preview-middleware): i18n handling for cards generator

## 0.23.45

_Released: 2025-11-04T04:08:19Z_

### Patch Changes

- e985618: feat(preview-middleware): enable card generator for CAP projects

## 0.23.44

_Released: 2025-11-03T12:49:26Z_

### Patch Changes

- a0c3b6c: feat: add log messages for viewCache redirect

## 0.23.43

_Released: 2025-11-03T10:50:00Z_

### Patch Changes

- @sap-ux/adp-tooling@0.17.5

## 0.23.42

_Released: 2025-10-31T13:35:34Z_

### Patch Changes

- @sap-ux/adp-tooling@0.17.4
- @sap-ux/system-access@0.6.27

## 0.23.41

_Released: 2025-10-30T10:09:21Z_

### Patch Changes

- @sap-ux/adp-tooling@0.17.3
- @sap-ux/system-access@0.6.26

## 0.23.40

_Released: 2025-10-29T17:02:38Z_

### Patch Changes

- @sap-ux/adp-tooling@0.17.2
- @sap-ux/system-access@0.6.25

## 0.23.39

_Released: 2025-10-29T11:04:17Z_

### Patch Changes

- @sap-ux/adp-tooling@0.17.1
- @sap-ux/system-access@0.6.24

## 0.23.38

_Released: 2025-10-28T13:36:39Z_

### Patch Changes

- Updated dependencies [cdeb18b]
    - @sap-ux/adp-tooling@0.17.0
    - @sap-ux/system-access@0.6.23

## 0.23.37

_Released: 2025-10-28T09:08:24Z_

### Patch Changes

- Updated dependencies [05ecba6]
    - @sap-ux/adp-tooling@0.16.14

## 0.23.36

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7
    - @sap-ux/adp-tooling@0.16.13
    - @sap-ux/system-access@0.6.22

## 0.23.35

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- Updated dependencies [fa9580c]
    - @sap-ux/adp-tooling@0.16.12
    - @sap-ux/feature-toggle@0.3.3
    - @sap-ux/system-access@0.6.22

## 0.23.34

_Released: 2025-10-22T12:44:17Z_

### Patch Changes

- Updated dependencies [27fb53e]
    - @sap-ux/adp-tooling@0.16.11

## 0.23.33

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6
    - @sap-ux/adp-tooling@0.16.10
    - @sap-ux/system-access@0.6.21

## 0.23.32

_Released: 2025-10-21T09:37:06Z_

### Patch Changes

- @sap-ux/adp-tooling@0.16.9

## 0.23.31

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5
    - @sap-ux/adp-tooling@0.16.8
    - @sap-ux/system-access@0.6.21

## 0.23.30

_Released: 2025-10-17T14:58:57Z_

### Patch Changes

- Updated dependencies [233259c]
    - @sap-ux/adp-tooling@0.16.7

## 0.23.29

_Released: 2025-10-17T11:37:38Z_

### Patch Changes

- @sap-ux/adp-tooling@0.16.6
- @sap-ux/system-access@0.6.21

## 0.23.28

_Released: 2025-10-17T09:45:11Z_

### Patch Changes

- @sap-ux/adp-tooling@0.16.5

## 0.23.27

_Released: 2025-10-15T16:45:46Z_

### Patch Changes

- @sap-ux/adp-tooling@0.16.4

## 0.23.26

_Released: 2025-10-15T14:30:03Z_

### Patch Changes

- Updated dependencies [441be86]
    - @sap-ux/adp-tooling@0.16.3

## 0.23.25

_Released: 2025-10-14T15:08:41Z_

### Patch Changes

- Updated dependencies [3e4bf96]
    - @sap-ux/adp-tooling@0.16.2

## 0.23.24

_Released: 2025-10-14T13:22:30Z_

### Patch Changes

- Updated dependencies [bacaf93]
    - @sap-ux/feature-toggle@0.3.2
    - @sap-ux/system-access@0.6.20
    - @sap-ux/adp-tooling@0.16.1

## 0.23.23

_Released: 2025-10-13T14:40:48Z_

### Patch Changes

- Updated dependencies [247a5a9]
    - @sap-ux/adp-tooling@0.16.0

## 0.23.22

_Released: 2025-10-13T07:04:12Z_

### Patch Changes

- Updated dependencies [1df9184]
    - @sap-ux/adp-tooling@0.15.38

## 0.23.21

_Released: 2025-10-10T13:53:56Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.37

## 0.23.20

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- 9e94382: Disable flex changes for preview with virtual endpoints using UI5 sources from npmjs
    - @sap-ux/adp-tooling@0.15.36
    - @sap-ux/project-access@1.32.4
    - @sap-ux/system-access@0.6.19

## 0.23.19

_Released: 2025-10-10T09:39:17Z_

### Patch Changes

- Updated dependencies [e015869]
    - @sap-ux/adp-tooling@0.15.35

## 0.23.18

_Released: 2025-10-07T13:15:25Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.34

## 0.23.17

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/project-access@1.32.3
    - @sap-ux/system-access@0.6.19
    - @sap-ux/adp-tooling@0.15.33
    - @sap-ux/btp-utils@1.1.4
    - @sap-ux/i18n@0.3.4

## 0.23.16

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.32
- @sap-ux/project-access@1.32.2
- @sap-ux/system-access@0.6.18

## 0.23.15

_Released: 2025-09-29T10:51:35Z_

### Patch Changes

- a22b24e: enhance logging for remote connection of windows users

## 0.23.14

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- 998954b: Upgrade bas-sdk to get axios updates
- Updated dependencies [998954b]
    - @sap-ux/btp-utils@1.1.3
    - @sap-ux/adp-tooling@0.15.31
    - @sap-ux/system-access@0.6.18

## 0.23.13

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/btp-utils@1.1.2
    - @sap-ux/adp-tooling@0.15.30
    - @sap-ux/system-access@0.6.17
    - @sap-ux/project-access@1.32.1

## 0.23.12

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0
    - @sap-ux/adp-tooling@0.15.29
    - @sap-ux/system-access@0.6.16

## 0.23.11

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0
    - @sap-ux/adp-tooling@0.15.28
    - @sap-ux/system-access@0.6.16

## 0.23.10

_Released: 2025-09-17T12:37:03Z_

### Patch Changes

- 8e8d781: feat: support preview on physical mobile devices

## 0.23.9

_Released: 2025-09-16T13:41:31Z_

### Patch Changes

- 4fa9dd9: fix: for disabling change table column quick action when variant management is disabled

## 0.23.8

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.27
- @sap-ux/project-access@1.30.14
- @sap-ux/system-access@0.6.16

## 0.23.7

_Released: 2025-09-11T11:04:24Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.26

## 0.23.6

_Released: 2025-09-03T14:26:25Z_

### Patch Changes

- Updated dependencies [f46dd02]
    - @sap-ux/adp-tooling@0.15.25

## 0.23.5

_Released: 2025-09-02T13:22:05Z_

### Patch Changes

- Updated dependencies [04d2103]
    - @sap-ux/feature-toggle@0.3.1
    - @sap-ux/adp-tooling@0.15.24
    - @sap-ux/system-access@0.6.16

## 0.23.4

_Released: 2025-09-01T12:06:20Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.23
- @sap-ux/system-access@0.6.15

## 0.23.3

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/btp-utils@1.1.1
    - @sap-ux/adp-tooling@0.15.22
    - @sap-ux/system-access@0.6.14
    - @sap-ux/project-access@1.30.13

## 0.23.2

_Released: 2025-08-25T12:19:51Z_

### Patch Changes

- Updated dependencies [384bb40]
    - @sap-ux/adp-tooling@0.15.21

## 0.23.1

_Released: 2025-08-21T14:27:46Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.20
- @sap-ux/system-access@0.6.13

## 0.23.0

_Released: 2025-08-20T14:35:17Z_

### Minor Changes

- 372e9ce: fix: [ADP][Info center] Remove all messages from the info center which overlap with messages added with the ui5 Log library.

## 0.22.1

_Released: 2025-08-20T12:18:39Z_

### Patch Changes

- Updated dependencies [0729936]
    - @sap-ux/adp-tooling@0.15.19

## 0.22.0

_Released: 2025-08-20T10:21:41Z_

### Minor Changes

- a39e0d9: fix: [ADP] For ui5 components which do not provide api.json we do not display Documentation error in the info center.

## 0.21.7

_Released: 2025-08-20T06:12:11Z_

### Patch Changes

- Updated dependencies [9f84298]
    - @sap-ux/adp-tooling@0.15.18

## 0.21.6

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- Updated dependencies [178dbea]
    - @sap-ux/adp-tooling@0.15.17
    - @sap-ux/project-access@1.30.12
    - @sap-ux/system-access@0.6.12

## 0.21.5

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/i18n@0.3.3
- @sap-ux/adp-tooling@0.15.16
- @sap-ux/project-access@1.30.11
- @sap-ux/system-access@0.6.12

## 0.21.4

_Released: 2025-08-12T14:05:27Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.15

## 0.21.3

_Released: 2025-08-07T06:27:29Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.14

## 0.21.2

_Released: 2025-08-06T13:30:46Z_

### Patch Changes

- ad49c30: fix: `Add Custom Table Column` Quick Action not using the correct fragment template.

## 0.21.1

_Released: 2025-08-04T07:58:35Z_

### Patch Changes

- 98fbd93: Store fragment parent control info in fragment body
- Updated dependencies [98fbd93]
    - @sap-ux/adp-tooling@0.15.13

## 0.21.0

_Released: 2025-08-01T13:45:39Z_

### Minor Changes

- b1213b1: feat: Track all errors/warnings/info messages created in the adaptation editor and display them in the Info center.

### Patch Changes

- @sap-ux/adp-tooling@0.15.12
- @sap-ux/system-access@0.6.12

## 0.20.74

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.11
- @sap-ux/project-access@1.30.10
- @sap-ux/system-access@0.6.11

## 0.20.73

_Released: 2025-07-31T11:23:22Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.10

## 0.20.72

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- 009143e: fix: resolve i18n key
- Updated dependencies [009143e]
    - @sap-ux/i18n@0.3.2
    - @sap-ux/adp-tooling@0.15.9
    - @sap-ux/project-access@1.30.9
    - @sap-ux/system-access@0.6.11

## 0.20.71

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8
    - @sap-ux/adp-tooling@0.15.8
    - @sap-ux/system-access@0.6.11

## 0.20.70

_Released: 2025-07-28T08:36:50Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.7
- @sap-ux/system-access@0.6.11

## 0.20.69

_Released: 2025-07-25T11:40:41Z_

### Patch Changes

- Updated dependencies [e25ee86]
    - @sap-ux/adp-tooling@0.15.6

## 0.20.68

_Released: 2025-07-25T09:16:43Z_

### Patch Changes

- Updated dependencies [d4a45ae]
    - @sap-ux/adp-tooling@0.15.5

## 0.20.67

_Released: 2025-07-22T13:05:35Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.4

## 0.20.66

_Released: 2025-07-21T13:01:41Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.3

## 0.20.65

_Released: 2025-07-17T17:44:35Z_

### Patch Changes

- 22fc2bf: feat: change file type of templates to ejs

## 0.20.64

_Released: 2025-07-17T13:47:26Z_

### Patch Changes

- @sap-ux/adp-tooling@0.15.2

## 0.20.63

_Released: 2025-07-17T08:59:54Z_

### Patch Changes

- Updated dependencies [52ac1b0]
    - @sap-ux/adp-tooling@0.15.1

## 0.20.62

_Released: 2025-07-16T14:40:22Z_

### Patch Changes

- Updated dependencies [e53c1f8]
    - @sap-ux/adp-tooling@0.15.0

## 0.20.61

_Released: 2025-07-16T12:23:18Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.44

## 0.20.60

_Released: 2025-07-15T08:04:00Z_

### Patch Changes

- eafb486: fix: default layer for rta

## 0.20.59

_Released: 2025-07-14T09:23:59Z_

### Patch Changes

- e5de360: fix: adjust test runner default pattern to avoid picking up wrong files

## 0.20.58

_Released: 2025-07-11T15:10:00Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.43

## 0.20.57

_Released: 2025-07-10T11:49:34Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.42

## 0.20.56

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7
    - @sap-ux/adp-tooling@0.14.41
    - @sap-ux/system-access@0.6.10

## 0.20.55

_Released: 2025-07-07T08:44:59Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.40

## 0.20.54

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- Updated dependencies [69f62ec]
    - @sap-ux/adp-tooling@0.14.39
    - @sap-ux/system-access@0.6.10

## 0.20.53

_Released: 2025-07-04T10:48:56Z_

### Patch Changes

- Updated dependencies [e9beeb4]
    - @sap-ux/adp-tooling@0.14.38

## 0.20.52

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.37
- @sap-ux/project-access@1.30.6
- @sap-ux/system-access@0.6.9

## 0.20.51

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5
    - @sap-ux/adp-tooling@0.14.36
    - @sap-ux/system-access@0.6.9

## 0.20.50

_Released: 2025-07-03T10:55:06Z_

### Patch Changes

- fc8cc4a: fix: detect all sync views

## 0.20.49

_Released: 2025-07-03T08:59:28Z_

### Patch Changes

- 67cf59e: make connector handling more robust and adjust min UI5 version for workspace connector usage to 1.76

## 0.20.48

_Released: 2025-07-02T05:46:03Z_

### Patch Changes

- 6c2d08a: Create app descriptor changes for v4 add custom section quick action
- Updated dependencies [6c2d08a]
    - @sap-ux/adp-tooling@0.14.35

## 0.20.47

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- Updated dependencies [b9675bb]
    - @sap-ux/adp-tooling@0.14.34

## 0.20.46

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/adp-tooling@0.14.33
    - @sap-ux/system-access@0.6.9

## 0.20.45

_Released: 2025-06-27T13:35:21Z_

### Patch Changes

- 0db69d6: fix: wrong property path used for Show Counts configuration change

## 0.20.44

_Released: 2025-06-27T07:08:06Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.32
- @sap-ux/system-access@0.6.9

## 0.20.43

_Released: 2025-06-25T10:51:12Z_

### Patch Changes

- Updated dependencies [83109eb]
    - @sap-ux/adp-tooling@0.14.31

## 0.20.42

_Released: 2025-06-24T14:02:12Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.30

## 0.20.41

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- Updated dependencies [f9ea9e3]
    - @sap-ux/adp-tooling@0.14.29
    - @sap-ux/system-access@0.6.8
    - @sap-ux/project-access@1.30.3

## 0.20.40

_Released: 2025-06-23T22:19:01Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.28
- @sap-ux/system-access@0.6.7

## 0.20.39

_Released: 2025-06-19T10:31:56Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.27
- @sap-ux/system-access@0.6.6

## 0.20.38

_Released: 2025-06-19T04:44:24Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.26
- @sap-ux/system-access@0.6.5

## 0.20.37

_Released: 2025-06-17T13:40:19Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.25

## 0.20.36

_Released: 2025-06-17T07:58:40Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.24

## 0.20.35

_Released: 2025-06-16T11:05:48Z_

### Patch Changes

- 59771f3: fix: Bump required versions of SAPUI5 for using ElementRegistry and RTA plugins

## 0.20.34

_Released: 2025-06-16T09:52:52Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.23

## 0.20.33

_Released: 2025-06-16T05:54:38Z_

### Patch Changes

- Updated dependencies [65edfba]
    - @sap-ux/adp-tooling@0.14.22

## 0.20.32

_Released: 2025-06-13T14:12:57Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.21

## 0.20.31

_Released: 2025-06-13T13:16:13Z_

### Patch Changes

- a9e93ff: fix: disable cards generator for CAP projects

## 0.20.30

_Released: 2025-06-13T10:58:52Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.20

## 0.20.29

_Released: 2025-06-11T12:23:45Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.19
- @sap-ux/system-access@0.6.4

## 0.20.28

_Released: 2025-06-10T17:08:16Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.18
- @sap-ux/system-access@0.6.3

## 0.20.27

_Released: 2025-06-10T09:28:31Z_

### Patch Changes

- Updated dependencies [f4439f1]
    - @sap-ux/adp-tooling@0.14.17

## 0.20.26

_Released: 2025-06-10T07:40:27Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.16

## 0.20.25

_Released: 2025-06-10T04:37:22Z_

### Patch Changes

- 135c3ae: fix: Duplicate Extension Points are selected in outline tree

## 0.20.24

_Released: 2025-06-09T09:48:34Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.15

## 0.20.23

_Released: 2025-06-09T08:08:28Z_

### Patch Changes

- ec78662: fix: variant changes are not shown in Adaptation Editor

## 0.20.22

_Released: 2025-06-05T12:32:35Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.14

## 0.20.21

_Released: 2025-06-05T11:52:10Z_

### Patch Changes

- 461c297: fix: only parse change files from `changes` folder.

## 0.20.20

_Released: 2025-06-05T07:23:07Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.13

## 0.20.19

_Released: 2025-06-04T10:59:54Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.12
- @sap-ux/system-access@0.6.2

## 0.20.18

_Released: 2025-06-03T11:51:09Z_

### Patch Changes

- 920c23d: Fix custom connector for flex changes in UI5 < 1.78

## 0.20.17

_Released: 2025-05-30T09:02:15Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.11

## 0.20.16

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- Updated dependencies [61ea5c0]
    - @sap-ux/adp-tooling@0.14.10
    - @sap-ux/project-access@1.30.2
    - @sap-ux/system-access@0.6.1

## 0.20.15

_Released: 2025-05-29T08:13:17Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.9

## 0.20.14

_Released: 2025-05-27T17:59:17Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.8

## 0.20.13

_Released: 2025-05-27T15:05:11Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.7

## 0.20.12

_Released: 2025-05-27T14:27:55Z_

### Patch Changes

- 87ecdb8: fix: change indicators missing for change with control id in outline and scrollbar styling issue on quick action panel

## 0.20.11

_Released: 2025-05-26T11:57:48Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.6

## 0.20.10

_Released: 2025-05-23T13:35:39Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.5
- @sap-ux/system-access@0.6.1

## 0.20.9

_Released: 2025-05-23T12:26:54Z_

### Patch Changes

- Updated dependencies [8e44d02]
    - @sap-ux/adp-tooling@0.14.4

## 0.20.8

_Released: 2025-05-22T16:20:10Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.3

## 0.20.7

_Released: 2025-05-22T12:34:30Z_

### Patch Changes

- 2702f19: fix local flp file leading to error with virtual cards generator endpoint

## 0.20.6

_Released: 2025-05-21T11:50:26Z_

### Patch Changes

- 225e7d7: fix: Add message when controller extension pending change is created

## 0.20.5

_Released: 2025-05-20T08:06:09Z_

### Patch Changes

- 48872e8: fix(preview-middleware) fix template spacing

## 0.20.4

_Released: 2025-05-19T05:14:26Z_

### Patch Changes

- c9b65f0: Migrate code from cards-editor-middleware to preview-middleware.

## 0.20.3

_Released: 2025-05-16T08:49:04Z_

### Patch Changes

- b49c43f: fix: added apptype to quickactions and contextmenu

## 0.20.2

_Released: 2025-05-15T14:05:09Z_

### Patch Changes

- 5f3aa03: feat: Integration of ExtendControllerPlugin in Adaptation Editor
- Updated dependencies [5f3aa03]
    - @sap-ux/adp-tooling@0.14.2

## 0.20.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- @sap-ux/adp-tooling@0.14.1
- @sap-ux/project-access@1.30.1
- @sap-ux/system-access@0.6.0

## 0.20.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/feature-toggle@0.3.0
    - @sap-ux/project-access@1.30.0
    - @sap-ux/system-access@0.6.0
    - @sap-ux/adp-tooling@0.14.0
    - @sap-ux/btp-utils@1.1.0
    - @sap-ux/logger@0.7.0

## 0.19.43

_Released: 2025-05-14T12:10:48Z_

### Patch Changes

- Updated dependencies [2ba9fe9]
    - @sap-ux/adp-tooling@0.13.45

## 0.19.42

_Released: 2025-05-14T10:05:14Z_

### Patch Changes

- a49ed05: Fix: Generic handling for change type and new UI component for displaying

## 0.19.41

_Released: 2025-05-13T10:46:10Z_

### Patch Changes

- Updated dependencies [5585f0d]
    - @sap-ux/feature-toggle@0.2.4
    - @sap-ux/adp-tooling@0.13.44
    - @sap-ux/system-access@0.5.39

## 0.19.40

_Released: 2025-05-08T10:12:31Z_

### Patch Changes

- Updated dependencies [6cb23c8]
    - @sap-ux/adp-tooling@0.13.43

## 0.19.39

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22
    - @sap-ux/adp-tooling@0.13.42
    - @sap-ux/system-access@0.5.38

## 0.19.38

_Released: 2025-05-02T15:10:51Z_

### Patch Changes

- c89bdc2: fix: new column is not visible after using `Add Custom Table Column` Quick Action

## 0.19.37

_Released: 2025-05-02T10:00:21Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.41
- @sap-ux/system-access@0.5.38

## 0.19.36

_Released: 2025-05-02T07:45:43Z_

### Patch Changes

- 9e7fa23: fix: Issues for Adaptation Projects using TypeScipt
- Updated dependencies [9e7fa23]
    - @sap-ux/adp-tooling@0.13.40

## 0.19.35

_Released: 2025-05-01T13:52:16Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.39

## 0.19.34

_Released: 2025-04-30T15:57:27Z_

### Patch Changes

- e00e43f: adjust readme

## 0.19.33

_Released: 2025-04-30T10:38:47Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.38

## 0.19.32

_Released: 2025-04-30T08:50:36Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.37
- @sap-ux/system-access@0.5.37

## 0.19.31

_Released: 2025-04-28T14:29:23Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.36

## 0.19.30

_Released: 2025-04-25T13:08:37Z_

### Patch Changes

- 258ecca: refactor: Enhance XML Fragment context menu control with addXMLPlugin Integration
- Updated dependencies [258ecca]
    - @sap-ux/adp-tooling@0.13.35

## 0.19.29

_Released: 2025-04-25T08:41:48Z_

### Patch Changes

- 091c3e9: fix: reuse component api consumption in Adaptation Editor

## 0.19.28

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.34
- @sap-ux/project-access@1.29.21
- @sap-ux/system-access@0.5.36

## 0.19.27

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20
    - @sap-ux/adp-tooling@0.13.33
    - @sap-ux/system-access@0.5.36

## 0.19.26

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.32
- @sap-ux/project-access@1.29.19
- @sap-ux/system-access@0.5.36

## 0.19.25

_Released: 2025-04-17T12:52:13Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.31

## 0.19.24

_Released: 2025-04-17T09:03:34Z_

### Patch Changes

- Updated dependencies [2db2c33]
    - @sap-ux/adp-tooling@0.13.30

## 0.19.23

_Released: 2025-04-15T15:11:22Z_

### Patch Changes

- 838d2de: fix: nested Quick Actions not working if there are sections with only one child (e.g Change Table Columns)

## 0.19.22

_Released: 2025-04-15T14:18:17Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.29
- @sap-ux/system-access@0.5.36

## 0.19.21

_Released: 2025-04-15T12:59:48Z_

### Patch Changes

- 8fe1ab6: fix: added telemetry tracking for context menu

## 0.19.20

_Released: 2025-04-15T10:10:52Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.28

## 0.19.19

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- Updated dependencies [d638daa]
    - @sap-ux/btp-utils@1.0.3
    - @sap-ux/adp-tooling@0.13.27
    - @sap-ux/system-access@0.5.35

## 0.19.18

_Released: 2025-04-14T10:45:46Z_

### Patch Changes

- a64c215: feat: Change Table Actions CPE quick action added for ADP projects with OData V2 and V4

## 0.19.17

_Released: 2025-04-11T08:09:06Z_

### Patch Changes

- Updated dependencies [c4278fb]
    - @sap-ux/adp-tooling@0.13.26

## 0.19.16

_Released: 2025-04-10T13:52:38Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.25

## 0.19.15

_Released: 2025-04-09T13:23:29Z_

### Patch Changes

- fccd2c2: feat: refactor types

## 0.19.14

_Released: 2025-04-09T06:44:54Z_

### Patch Changes

- Updated dependencies [c81864a]
    - @sap-ux/adp-tooling@0.13.24

## 0.19.13

_Released: 2025-04-08T13:20:49Z_

### Patch Changes

- Updated dependencies [4f0eaae]
    - @sap-ux/adp-tooling@0.13.23

## 0.19.12

_Released: 2025-04-03T10:27:23Z_

### Patch Changes

- 3727441: fix: CPE Add Subpage Quick Action not displayed for SAP Fiori Elements for OData V4 applications in Adaptation Projects, if current page has `contextPath` defined in manifest instead of `entitySet`.

## 0.19.11

_Released: 2025-04-03T09:56:21Z_

### Patch Changes

- 9522deb: fix: Cannot create a Extension Point fragment when clicking create button in the dialog

## 0.19.10

_Released: 2025-04-02T15:24:36Z_

### Patch Changes

- 6095875: fix: Cannot create a Fragment and Controller Extension when clicking create button in the dialog

## 0.19.9

_Released: 2025-04-02T07:47:22Z_

### Patch Changes

- ed6c364: Reuse component detection

## 0.19.8

_Released: 2025-03-31T11:57:23Z_

### Patch Changes

- 59ab22b: feat: Add Subpage CPE quick action added for ADP projects with OData V4.

## 0.19.7

_Released: 2025-03-30T09:30:38Z_

### Patch Changes

- Updated dependencies [fbdf2d0]
    - @sap-ux/adp-tooling@0.13.22

## 0.19.6

_Released: 2025-03-28T13:25:45Z_

### Patch Changes

- eebf808: feat: enable TypeScript compiler option `erasableSyntaxOnly`

## 0.19.5

_Released: 2025-03-27T11:46:15Z_

### Patch Changes

- 6cedb61: fix: enable telemetry for quickactions in adp

## 0.19.4

_Released: 2025-03-26T12:15:41Z_

### Patch Changes

- Updated dependencies [ced5edf]
    - @sap-ux/adp-tooling@0.13.21
    - @sap-ux/system-access@0.5.34

## 0.19.3

_Released: 2025-03-26T09:06:26Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.20

## 0.19.2

_Released: 2025-03-25T15:09:56Z_

### Patch Changes

- Updated dependencies [93f07bc]
    - @sap-ux/adp-tooling@0.13.19

## 0.19.1

_Released: 2025-03-22T09:43:02Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.18

## 0.19.0

_Released: 2025-03-20T17:49:21Z_

### Minor Changes

- 6e32009: feat: introduce enhanced flp homepage
    - controlled via boolean property `flp.enhancedHomePage`, which is false by default

## 0.18.23

_Released: 2025-03-19T11:57:33Z_

### Patch Changes

- 02874f7: feat: Feature toggle removed for Add Subpage CPE quick action

## 0.18.22

_Released: 2025-03-19T11:14:07Z_

### Patch Changes

- e754cb0: fix: disable "Add New Annotation File" Quick Action with tooltip, when 'metadata' is not loaded
- Updated dependencies [e754cb0]
    - @sap-ux/adp-tooling@0.13.17

## 0.18.21

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18
    - @sap-ux/adp-tooling@0.13.16
    - @sap-ux/system-access@0.5.33

## 0.18.20

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.15
- @sap-ux/project-access@1.29.17
- @sap-ux/system-access@0.5.33

## 0.18.19

_Released: 2025-03-14T14:57:28Z_

### Patch Changes

- b012c01: feat: Added new CPE Quick Action to create application subpages in V2 ADP projects

## 0.18.18

_Released: 2025-03-14T13:47:34Z_

### Patch Changes

- 1fd8b3f: fix: legacy free ui5 version handling

## 0.18.17

_Released: 2025-03-14T09:27:23Z_

### Patch Changes

- f659540: fix: disable "Add Header Field" Quick Action when `showHeaderContent` is set to `false` for `ObjectPageLayout`

## 0.18.16

_Released: 2025-03-11T09:32:55Z_

### Patch Changes

- 32dafd7: feat: refactor lrep connectors used for preview

## 0.18.15

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/btp-utils@1.0.2
    - @sap-ux/adp-tooling@0.13.14
    - @sap-ux/system-access@0.5.33
    - @sap-ux/project-access@1.29.16

## 0.18.14

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15
    - @sap-ux/adp-tooling@0.13.13
    - @sap-ux/system-access@0.5.32

## 0.18.13

_Released: 2025-03-06T08:13:39Z_

### Patch Changes

- 1c07ab9: Allow controller extensions for reuse components on OnPremise systems
- Updated dependencies [1c07ab9]
    - @sap-ux/adp-tooling@0.13.12

## 0.18.12

_Released: 2025-03-05T14:45:32Z_

### Patch Changes

- 8568e6b: feat: Info Center for different type of messages

## 0.18.11

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14
    - @sap-ux/adp-tooling@0.13.11

## 0.18.10

_Released: 2025-03-05T09:53:57Z_

### Patch Changes

- Updated dependencies [14bec21]
    - @sap-ux/adp-tooling@0.13.10

## 0.18.9

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.9
- @sap-ux/project-access@1.29.13

## 0.18.8

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.8
- @sap-ux/project-access@1.29.12

## 0.18.7

_Released: 2025-03-03T11:06:12Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.7

## 0.18.6

_Released: 2025-03-03T08:50:39Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.6

## 0.18.5

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11
    - @sap-ux/adp-tooling@0.13.5

## 0.18.4

_Released: 2025-02-28T08:16:02Z_

### Patch Changes

- 78dd2c2: fix: TypeScript template causes the iframe to break when controller extension is loaded
- Updated dependencies [78dd2c2]
    - @sap-ux/adp-tooling@0.13.4

## 0.18.3

_Released: 2025-02-27T19:24:50Z_

### Patch Changes

- @sap-ux/adp-tooling@0.13.3

## 0.18.2

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- Updated dependencies [4b8577f]
    - @sap-ux/adp-tooling@0.13.2
    - @sap-ux/project-access@1.29.10

## 0.18.1

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- 1d4ba46: feat: handling of legacy free ui5 version
- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9
    - @sap-ux/adp-tooling@0.13.1

## 0.18.0

_Released: 2025-02-26T11:38:25Z_

### Minor Changes

- 127bd12: feat: Add Typescript support for Adaptation Project

### Patch Changes

- Updated dependencies [127bd12]
    - @sap-ux/adp-tooling@0.13.0

## 0.17.48

_Released: 2025-02-24T09:17:17Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.138

## 0.17.47

_Released: 2025-02-20T16:17:08Z_

### Patch Changes

- df8d790: fix: 'Add Custom Table Column' CPE quick action is generating incorrect column fragment for Grid and Tree tables
- Updated dependencies [df8d790]
    - @sap-ux/adp-tooling@0.12.137

## 0.17.46

_Released: 2025-02-20T14:59:15Z_

### Patch Changes

- 1bcd64f: Fix: "Add Table Custom Action" quick action not being working in some V2 apps

## 0.17.45

_Released: 2025-02-20T09:07:29Z_

### Patch Changes

- ef57432: fix: re-route issue with cds-plugin-ui5

## 0.17.44

_Released: 2025-02-19T15:40:17Z_

### Patch Changes

- 583c4cd: Fix: Default aggregation array index to 1 for create page action and create table action

## 0.17.43

_Released: 2025-02-19T14:00:10Z_

### Patch Changes

- fd3bfb0: fix: "Add Table Custom Action" quick action not being working in some V2 apps

## 0.17.42

_Released: 2025-02-19T07:51:13Z_

### Patch Changes

- Updated dependencies [bb38bef]
    - @sap-ux/adp-tooling@0.12.136

## 0.17.41

_Released: 2025-02-18T18:24:37Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.135

## 0.17.40

_Released: 2025-02-18T13:48:13Z_

### Patch Changes

- 8930179: fix: New column created by "Add Table Custom Column" quick action not being displayed, due to incomplete column data in the fragment
- Updated dependencies [8930179]
    - @sap-ux/adp-tooling@0.12.134

## 0.17.39

_Released: 2025-02-17T19:48:07Z_

### Patch Changes

- 5226a61: feat: introduce 'editors' property on config root level

## 0.17.38

_Released: 2025-02-17T16:12:15Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.133

## 0.17.37

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8
    - @sap-ux/adp-tooling@0.12.132

## 0.17.36

_Released: 2025-02-17T11:44:22Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.131

## 0.17.35

_Released: 2025-02-14T13:14:56Z_

### Patch Changes

- 931e735: Add stable ids to form elements

## 0.17.34

_Released: 2025-02-14T10:33:11Z_

### Patch Changes

- 354107e: fix: Fixed bug in CPE. In some ADP projects Change Table Columns Quick Action didn't work

## 0.17.33

_Released: 2025-02-14T10:07:13Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.130

## 0.17.32

_Released: 2025-02-13T17:39:11Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.129

## 0.17.31

_Released: 2025-02-13T15:50:31Z_

### Patch Changes

- 4d0b026: fix: undo redo issue for v2 manifest changes created via quickactions

## 0.17.30

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7
    - @sap-ux/adp-tooling@0.12.128

## 0.17.29

_Released: 2025-02-12T10:20:01Z_

### Patch Changes

- 063a2f4: fix: enable manifest actions for v2 apps with array page structure

## 0.17.28

_Released: 2025-02-11T12:37:59Z_

### Patch Changes

- d95bade: fix: Fixed various bugs related to Enable Variant Management for Tables quick action. It was unnecessarily disabled in some apps on List Report; changing Object Page table type led to enabling this action again; action is disabled now for custom tables, where it can't be applied.

## 0.17.27

_Released: 2025-02-11T10:08:55Z_

### Patch Changes

- 7c76e7c: fix: unify contextual menu for all nodes in outline panel.

## 0.17.26

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.127
- @sap-ux/project-access@1.29.6

## 0.17.25

_Released: 2025-02-07T10:33:58Z_

### Patch Changes

- 644a9a6: feat: Scroll into view when clicking on a control that is not currently visible in the iframe

## 0.17.24

_Released: 2025-02-06T22:08:41Z_

### Patch Changes

- 59453ba: fix(security): security findings from github
- Updated dependencies [59453ba]
    - @sap-ux/adp-tooling@0.12.126

## 0.17.23

_Released: 2025-02-06T09:02:49Z_

### Patch Changes

- b214776: fix: remove hard coded usage of webapp folder

## 0.17.22

_Released: 2025-02-05T19:56:21Z_

### Patch Changes

- 9bccf03: feat: add support for type component

## 0.17.21

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- Updated dependencies [78bc772]
    - @sap-ux/adp-tooling@0.12.125
    - @sap-ux/project-access@1.29.5

## 0.17.20

_Released: 2025-02-05T15:41:32Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.124

## 0.17.19

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- Updated dependencies [65f15d9]
    - @sap-ux/btp-utils@1.0.1
    - @sap-ux/adp-tooling@0.12.123

## 0.17.18

_Released: 2025-02-05T12:39:22Z_

### Patch Changes

- 9ddf98f: Feature to add context menu on outline

## 0.17.17

_Released: 2025-02-05T09:24:10Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.122

## 0.17.16

_Released: 2025-02-05T07:28:28Z_

### Patch Changes

- 5eff701: Fixed undo-redo issue for addAnnotationsToOdata change and updated title for the pending addAnnotationsToOdata change.

## 0.17.15

_Released: 2025-02-04T20:58:06Z_

### Patch Changes

- 5c127cf: fix: ui5 version protocol for karma tests

## 0.17.14

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- Updated dependencies [29abc73]
    - @sap-ux/project-access@1.29.4
    - @sap-ux/adp-tooling@0.12.121

## 0.17.13

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- Updated dependencies [9980073]
    - @sap-ux/btp-utils@1.0.0
    - @sap-ux/adp-tooling@0.12.120

## 0.17.12

_Released: 2025-02-03T11:19:18Z_

### Patch Changes

- 740f4d9: fix: CPE Quick action bug fix in ALP v4 projects. Add Custom Table Action worked incorrectly on Analytical Pages with multiple action toolbars in charts and tables.
  Some V4 Quick Action code refactoring to optimize

## 0.17.11

_Released: 2025-02-03T08:48:10Z_

### Patch Changes

- 6b55228: Bind i18n models with namespace

## 0.17.10

_Released: 2025-01-31T16:09:34Z_

### Patch Changes

- 1f0bb25: fix: refactor object clones

## 0.17.9

_Released: 2025-01-31T13:54:48Z_

### Patch Changes

- 61edb7b: Fixed "Enable/Disable Semantic Date Range in Filter Bar" quick action in SAP Fiori Elements for OData V2 applications when using UI5 version lower than 1.126.

## 0.17.8

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- Updated dependencies [096b021]
    - @sap-ux/project-access@1.29.3
    - @sap-ux/adp-tooling@0.12.119

## 0.17.7

_Released: 2025-01-29T17:41:08Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.118

## 0.17.6

_Released: 2025-01-29T14:23:25Z_

### Patch Changes

- 1f98f07: Add stable ids in AddFragment and ControllerExtension forms

## 0.17.5

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- Updated dependencies [df2d965]
    - @sap-ux/btp-utils@0.18.0
    - @sap-ux/adp-tooling@0.12.117

## 0.17.4

_Released: 2025-01-28T17:41:21Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.116

## 0.17.3

_Released: 2025-01-28T10:44:06Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.115

## 0.17.2

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- Updated dependencies [93ef8c1]
    - @sap-ux/project-access@1.29.2
    - @sap-ux/adp-tooling@0.12.114

## 0.17.1

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.113
- @sap-ux/project-access@1.29.1

## 0.17.0

_Released: 2025-01-27T17:47:21Z_

### Minor Changes

- 0c3964e: add url param viewCache in case it is missing

## 0.16.175

_Released: 2025-01-27T15:56:32Z_

### Patch Changes

- 34bfb02: fix: parameter type of fakeConnector create function

## 0.16.174

_Released: 2025-01-22T18:11:17Z_

### Patch Changes

- 1586cc3: CPE: Enable Variant Management in Tables and Charts Quick Action

## 0.16.173

_Released: 2025-01-22T17:11:37Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.112

## 0.16.172

_Released: 2025-01-22T13:03:36Z_

### Patch Changes

- b88531b: fix: Enabled missing quick actions on ALP in V2 adp projects

## 0.16.171

_Released: 2025-01-17T09:30:45Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.111

## 0.16.170

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- Updated dependencies [88bf030]
    - @sap-ux/project-access@1.29.0
    - @sap-ux/adp-tooling@0.12.110

## 0.16.169

_Released: 2025-01-15T14:46:53Z_

### Patch Changes

- 2a9c788: Fixed wrong initial state for "Disable Semantic Date Range in Filter Bar" Quick Action.

## 0.16.168

_Released: 2025-01-14T16:54:17Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.109

## 0.16.167

_Released: 2025-01-14T08:43:30Z_

### Patch Changes

- 1358041: fix: Manifest change for enabling semantic date range has no effect on running app with UI5 latest snapshot (=>1.132)

## 0.16.166

_Released: 2025-01-13T18:05:42Z_

### Patch Changes

- f115bfa: fix: update quick action list on external changes
- Updated dependencies [f115bfa]
    - @sap-ux/adp-tooling@0.12.108

## 0.16.165

_Released: 2025-01-10T12:45:00Z_

### Patch Changes

- Updated dependencies [030857d]
    - @sap-ux/adp-tooling@0.12.107

## 0.16.164

_Released: 2025-01-09T12:31:59Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.106

## 0.16.163

_Released: 2025-01-08T17:16:17Z_

### Patch Changes

- 19d51f3: feat: Quick Action For Add New Annotation File
- Updated dependencies [19d51f3]
    - @sap-ux/adp-tooling@0.12.105

## 0.16.162

_Released: 2025-01-08T16:18:38Z_

### Patch Changes

- 8b7ed76: Fixed outline not being displayed in SAP Fiori Elements for OData V4 applications with multiple views.

## 0.16.161

_Released: 2025-01-08T15:30:03Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.104

## 0.16.160

_Released: 2025-01-08T11:51:44Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.103

## 0.16.159

_Released: 2025-01-08T10:44:36Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.102

## 0.16.158

_Released: 2025-01-07T14:21:16Z_

### Patch Changes

- d964a24: feat: add option to convert test runners to preview-config command

## 0.16.157

_Released: 2024-12-23T10:38:10Z_

### Patch Changes

- d529c38: Fixed Quick Actions not working after trying to open multiple dialogs and Quick Actions that create manifest changes in SAP Fiori Elements for OData V2 applications not showing correct state when there are unsaved manifest changes.

## 0.16.156

_Released: 2024-12-23T08:07:40Z_

### Patch Changes

- 0633837: Added quick action to enable Inline Rows Creation in the Object Page tables

## 0.16.155

_Released: 2024-12-20T15:43:15Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.101

## 0.16.154

_Released: 2024-12-19T17:24:19Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.100

## 0.16.153

_Released: 2024-12-18T10:32:41Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.99

## 0.16.152

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- Updated dependencies [e1edcd7]
    - @sap-ux/project-access@1.28.10
    - @sap-ux/adp-tooling@0.12.98

## 0.16.151

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- Updated dependencies [cb54b44]
    - @sap-ux/btp-utils@0.17.2
    - @sap-ux/adp-tooling@0.12.97

## 0.16.150

_Released: 2024-12-16T20:04:55Z_

### Patch Changes

- 5c4dc74: feat: add a more precise method to determine the current UI5 version

## 0.16.149

_Released: 2024-12-12T16:56:32Z_

### Patch Changes

- 77cf576: Load changes from workspace in Preview after deployment

## 0.16.148

_Released: 2024-12-10T16:04:29Z_

### Patch Changes

- Updated dependencies [3ebd767]
    - @sap-ux/adp-tooling@0.12.96

## 0.16.147

_Released: 2024-12-10T14:32:00Z_

### Patch Changes

- Updated dependencies [0c64478]
    - @sap-ux/adp-tooling@0.12.95

## 0.16.146

_Released: 2024-12-10T11:51:29Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.94

## 0.16.145

_Released: 2024-12-10T10:48:59Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.93

## 0.16.144

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- e93797a: Added the `convert` command to convert local preview files of a project to virtual files.
- Updated dependencies [e93797a]
    - @sap-ux/project-access@1.28.9
    - @sap-ux/adp-tooling@0.12.92

## 0.16.143

_Released: 2024-12-05T14:52:52Z_

### Patch Changes

- 62c73b8: CPE - Hide Quick Actions in V2 application, if the application has old manifest structure.

## 0.16.142

_Released: 2024-12-05T13:35:32Z_

### Patch Changes

- 76d5dcb: CPE - Update tooltip text for disabled table filtering variant quick action

## 0.16.141

_Released: 2024-12-04T15:30:32Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.91

## 0.16.140

_Released: 2024-12-04T14:21:28Z_

### Patch Changes

- Updated dependencies [3805f2e]
    - @sap-ux/adp-tooling@0.12.90

## 0.16.139

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- Updated dependencies [2359524]
    - @sap-ux/btp-utils@0.17.1
    - @sap-ux/adp-tooling@0.12.89

## 0.16.138

_Released: 2024-12-04T11:05:53Z_

### Patch Changes

- Updated dependencies [d04a40e]
    - @sap-ux/feature-toggle@0.2.3
    - @sap-ux/adp-tooling@0.12.88

## 0.16.137

_Released: 2024-12-03T19:20:21Z_

### Patch Changes

- 0fb08df: Use ui5 version specific flp sandbox template instead of dynamic bootstrap

## 0.16.136

_Released: 2024-12-02T20:00:53Z_

### Patch Changes

- Updated dependencies [14163cd]
    - @sap-ux/adp-tooling@0.12.87

## 0.16.135

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.86
- @sap-ux/project-access@1.28.8

## 0.16.134

_Released: 2024-12-02T15:33:37Z_

### Patch Changes

- c10bf9f: fix: Various lint error fixes and code improvements

## 0.16.133

_Released: 2024-12-02T11:02:56Z_

### Patch Changes

- 70e6d46: CPE - Disable Add Custom Column Quick Action, if table rows are required and not available

## 0.16.132

_Released: 2024-11-29T13:58:32Z_

### Patch Changes

- 79d2435: fix: remove feature toggle check for Enable/Disable Semantic Date Range in Filter Bar
- ca82698: CPE - Enable Table Filtering Quick Action

## 0.16.131

_Released: 2024-11-27T12:48:07Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.85

## 0.16.130

_Released: 2024-11-27T11:23:07Z_

### Patch Changes

- Updated dependencies [6e60bdf]
    - @sap-ux/adp-tooling@0.12.84

## 0.16.129

_Released: 2024-11-27T09:57:43Z_

### Patch Changes

- 71bef63: fix: update quick action title for semantic date range

## 0.16.128

_Released: 2024-11-25T12:18:22Z_

### Patch Changes

- 09a58bb: chore: upgrade vocabularies-types + pnpm updates
- Updated dependencies [09a58bb]
    - @sap-ux/adp-tooling@0.12.83

## 0.16.127

_Released: 2024-11-21T13:02:44Z_

### Patch Changes

- c39325c: Fix for Config Quick action state not reflecting properties in properties panel

## 0.16.126

_Released: 2024-11-21T11:48:14Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.82

## 0.16.125

_Released: 2024-11-21T09:29:17Z_

### Patch Changes

- 326dbe5: Enable adding fragment to elements cloned from a template

## 0.16.124

_Released: 2024-11-20T16:11:59Z_

### Patch Changes

- e9438d6: fix: restrict the '"Semantic Date Range" in filter bar' quick-action for certain UI5 versions which are not supported for V2 application.

## 0.16.123

_Released: 2024-11-19T15:25:45Z_

### Patch Changes

- 2a72ad2: chore - Fix audit issues
- Updated dependencies [2a72ad2]
    - @sap-ux/adp-tooling@0.12.81

## 0.16.122

_Released: 2024-11-19T13:21:01Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.80

## 0.16.121

_Released: 2024-11-18T22:28:16Z_

### Patch Changes

- Updated dependencies [a62ff25]
    - @sap-ux/btp-utils@0.17.0
    - @sap-ux/adp-tooling@0.12.79

## 0.16.120

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.78
- @sap-ux/project-access@1.28.7

## 0.16.119

_Released: 2024-11-17T22:14:47Z_

### Patch Changes

- Updated dependencies [8237f83]
    - @sap-ux/adp-tooling@0.12.77

## 0.16.118

_Released: 2024-11-15T17:07:03Z_

### Patch Changes

- 1f7827c: handle higher layer changes

## 0.16.117

_Released: 2024-11-15T09:46:36Z_

### Patch Changes

- f2d3335: Hide "Semantic Date Range" Quick Action behind feature toggle.

## 0.16.116

_Released: 2024-11-14T17:04:56Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.76

## 0.16.115

_Released: 2024-11-13T16:02:41Z_

### Patch Changes

- 8c0ba5c: Fixed Adaptation Editor crash when project contains Personalization change.

## 0.16.114

_Released: 2024-11-13T12:42:43Z_

### Patch Changes

- 8b123e3: Fixed typo in "Semantic Date Range" quick action.

## 0.16.113

_Released: 2024-11-13T09:28:03Z_

### Patch Changes

- fcc5518: Remove feature flag from "Add Custom Table Action", "Add Custom Page Action", "Add Custom Table Column" and "Change Table Columns" Quick Actions.

## 0.16.112

_Released: 2024-11-11T17:55:13Z_

### Patch Changes

- Updated dependencies [3734fe8]
    - @sap-ux/btp-utils@0.16.0
    - @sap-ux/adp-tooling@0.12.75

## 0.16.111

_Released: 2024-11-11T16:15:22Z_

### Patch Changes

- 48dd15d: fix: refresh descriptor after manifest changes
- Updated dependencies [48dd15d]
    - @sap-ux/adp-tooling@0.12.74

## 0.16.110

_Released: 2024-11-11T13:10:42Z_

### Patch Changes

- 838cdf1: fix: Unavailability of changeHandlerAPI in lower ui5 version causes console to be spammed with errors

## 0.16.109

_Released: 2024-11-08T15:21:08Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.73

## 0.16.108

_Released: 2024-11-08T11:05:11Z_

### Patch Changes

- 25488a9: fix: resolve the issue when add table action quick action in the object page didn't work because the Variant Management was disabled.

## 0.16.107

_Released: 2024-11-08T08:58:34Z_

### Patch Changes

- Updated dependencies [fb26f92]
    - @sap-ux/project-access@1.28.6
    - @sap-ux/adp-tooling@0.12.72

## 0.16.106

_Released: 2024-11-07T16:57:18Z_

### Patch Changes

- 0671c95: support semantic date range quick action for v2/v4

## 0.16.105

_Released: 2024-11-07T09:36:42Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.71

## 0.16.104

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.70
- @sap-ux/project-access@1.28.5

## 0.16.103

_Released: 2024-11-05T13:50:29Z_

### Patch Changes

- Updated dependencies [5a68903]
    - @sap-ux/project-access@1.28.4
    - @sap-ux/adp-tooling@0.12.69

## 0.16.102

_Released: 2024-11-01T22:26:57Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.68

## 0.16.101

_Released: 2024-11-01T07:47:25Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.67

## 0.16.100

_Released: 2024-10-31T11:07:24Z_

### Patch Changes

- 61cea6d: Fix: Resolved an issue where Add Custom Table Column quick action didn't work with Analytical/Grid/Tree tables in SAP Fiori Elements for OData V2.

## 0.16.99

_Released: 2024-10-31T07:40:48Z_

### Patch Changes

- Updated dependencies [42f13eb]
    - @sap-ux/project-access@1.28.3
    - @sap-ux/adp-tooling@0.12.66

## 0.16.98

_Released: 2024-10-30T16:46:53Z_

### Patch Changes

- df6fd7f: Quick action added to create custom table columns
- Updated dependencies [df6fd7f]
    - @sap-ux/adp-tooling@0.12.65

## 0.16.97

_Released: 2024-10-30T13:01:12Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.64

## 0.16.96

_Released: 2024-10-30T10:01:08Z_

### Patch Changes

- 29a4ef6: feat: create page and table action quick actions for OData(v4) applications
- Updated dependencies [29a4ef6]
    - @sap-ux/adp-tooling@0.12.63

## 0.16.95

_Released: 2024-10-30T09:11:46Z_

### Patch Changes

- 4f9528e: Fixed incorrect displaying of inactive composite and control changes

## 0.16.94

_Released: 2024-10-29T09:24:19Z_

### Patch Changes

- fe9febe: add deep links to readme

## 0.16.93

_Released: 2024-10-25T14:04:19Z_

### Patch Changes

- 5ec7106: Modified indicators incorrectly displayed for some UI5 controls in Adaptation Project

## 0.16.92

_Released: 2024-10-24T14:04:35Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.62

## 0.16.91

_Released: 2024-10-24T10:07:41Z_

### Patch Changes

- c04007b: Enable quick actions by default

## 0.16.90

_Released: 2024-10-23T12:50:19Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.61

## 0.16.89

_Released: 2024-10-22T10:05:55Z_

### Patch Changes

- 3e9cab4: make rta editor url params optional

## 0.16.88

_Released: 2024-10-22T09:03:13Z_

### Patch Changes

- 9bda640: CPE loading changes from backend and not from workspace
- Updated dependencies [9bda640]
    - @sap-ux/adp-tooling@0.12.60

## 0.16.87

_Released: 2024-10-16T14:50:28Z_

### Patch Changes

- 93ffe8d: Use feature toggles in the control property editor
- Updated dependencies [93ffe8d]
    - @sap-ux/feature-toggle@0.2.2

## 0.16.86

_Released: 2024-10-16T08:21:13Z_

### Patch Changes

- Updated dependencies [eb38e5b]
    - @sap-ux/project-access@1.28.2
    - @sap-ux/adp-tooling@0.12.59

## 0.16.85

_Released: 2024-10-14T21:48:37Z_

### Patch Changes

- Updated dependencies [64e037d]
    - @sap-ux/project-access@1.28.1
    - @sap-ux/adp-tooling@0.12.58

## 0.16.84

_Released: 2024-10-14T16:41:16Z_

### Patch Changes

- Updated dependencies [15e6959]
    - @sap-ux/project-access@1.28.0
    - @sap-ux/adp-tooling@0.12.57

## 0.16.83

_Released: 2024-10-08T16:07:31Z_

### Patch Changes

- 6cd7e89: version bump to get newest version of preview middleware client

## 0.16.82

_Released: 2024-10-08T10:16:01Z_

### Patch Changes

- Updated dependencies [eb74890]
    - @sap-ux/project-access@1.27.6
    - @sap-ux/adp-tooling@0.12.56

## 0.16.81

_Released: 2024-10-07T14:03:34Z_

### Patch Changes

- fd215c2: Fixed a bug - Add Custom Page Action is not shown on the Object Page in some cases

## 0.16.80

_Released: 2024-10-04T15:21:13Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.55

## 0.16.79

_Released: 2024-10-02T14:28:15Z_

### Patch Changes

- Updated dependencies [a64a3a5]
    - @sap-ux/project-access@1.27.5
    - @sap-ux/adp-tooling@0.12.54

## 0.16.78

_Released: 2024-10-02T11:32:12Z_

### Patch Changes

- 7479bd3: fix: add page and table quick actions v2 app
- Updated dependencies [7479bd3]
    - @sap-ux/adp-tooling@0.12.53

## 0.16.77

_Released: 2024-10-02T11:00:38Z_

### Patch Changes

- 9605bb0: fix: ignore developerMode from rta editor config in case of no adp project

## 0.16.76

_Released: 2024-10-01T09:10:42Z_

### Patch Changes

- 1da1e7a: Small CPE UI improvements

## 0.16.75

_Released: 2024-10-01T05:39:47Z_

### Patch Changes

- 5a79abd: make rta editors path more resilient

## 0.16.74

_Released: 2024-09-27T13:04:40Z_

### Patch Changes

- c1462a9: fix: check if the flexbox is in objectpage and in Dyanmic header.

## 0.16.73

_Released: 2024-09-26T15:06:27Z_

### Patch Changes

- 7579b99: UI improvements and bug fix in the Adaptation Editor

## 0.16.72

_Released: 2024-09-25T13:19:11Z_

### Patch Changes

- 595bdea: feat: enhance "add-header-field" quick action with the template
- Updated dependencies [595bdea]
    - @sap-ux/adp-tooling@0.12.52

## 0.16.71

_Released: 2024-09-25T08:23:49Z_

### Patch Changes

- b37b4c1: Fixed application mode after reload and various other usability fixes for Quick Actions

## 0.16.70

_Released: 2024-09-24T11:55:25Z_

### Patch Changes

- 8f442a6: Usability improvements for Quick Actions that add fragments

## 0.16.69

_Released: 2024-09-23T10:02:33Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.51
- @sap-ux/project-access@1.27.4

## 0.16.68

_Released: 2024-09-19T21:55:12Z_

### Patch Changes

- 00e1835: Fixed manifest changes not visible in preview after reload
- Updated dependencies [00e1835]
    - @sap-ux/adp-tooling@0.12.50

## 0.16.67

_Released: 2024-09-18T16:51:00Z_

### Patch Changes

- 1c20352: Added missing notification when manifest change is created

## 0.16.66

_Released: 2024-09-18T14:01:49Z_

### Patch Changes

- Updated dependencies [070182d]
    - @sap-ux/project-access@1.27.3
    - @sap-ux/adp-tooling@0.12.49

## 0.16.65

_Released: 2024-09-17T10:23:36Z_

### Patch Changes

- Updated dependencies [2fd82b1]
    - @sap-ux/adp-tooling@0.12.48

## 0.16.64

_Released: 2024-09-16T16:29:20Z_

### Patch Changes

- 09f91c3: Fix changing index in Add Fragment dialog

## 0.16.63

_Released: 2024-09-12T09:42:45Z_

### Patch Changes

- Updated dependencies [09522df]
    - @sap-ux/project-access@1.27.2
    - @sap-ux/adp-tooling@0.12.47

## 0.16.62

_Released: 2024-09-11T10:59:39Z_

### Patch Changes

- Updated dependencies [aa72f3c]
    - @sap-ux/adp-tooling@0.12.46

## 0.16.61

_Released: 2024-09-06T09:47:05Z_

### Patch Changes

- 247e0bb: fix: quick action titles

## 0.16.60

_Released: 2024-09-04T13:28:04Z_

### Patch Changes

- 0b7af6a: remove z-index for sticky Search and filter bar and added updating highlighting control logic

## 0.16.59

_Released: 2024-09-04T11:08:59Z_

### Patch Changes

- b1628da: Add quick actions to adaptation editor

## 0.16.58

_Released: 2024-09-03T19:06:21Z_

### Patch Changes

- Updated dependencies [d962ce1]
    - @sap-ux/project-access@1.27.1
    - @sap-ux/adp-tooling@0.12.45

## 0.16.57

_Released: 2024-08-30T11:32:43Z_

### Patch Changes

- Updated dependencies [1294b1c]
    - @sap-ux/adp-tooling@0.12.44

## 0.16.56

_Released: 2024-08-30T06:05:30Z_

### Patch Changes

- Updated dependencies [df29368]
    - @sap-ux/project-access@1.27.0
    - @sap-ux/adp-tooling@0.12.43

## 0.16.55

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.42
- @sap-ux/project-access@1.26.9

## 0.16.54

_Released: 2024-08-23T10:57:41Z_

### Patch Changes

- Updated dependencies [d3dafeb]
    - @sap-ux/btp-utils@0.15.2
    - @sap-ux/adp-tooling@0.12.41

## 0.16.53

_Released: 2024-08-21T10:47:59Z_

### Patch Changes

- ceed987: Fixed copy to clipboard chaching old control id values

## 0.16.52

_Released: 2024-08-21T08:00:39Z_

### Patch Changes

- Updated dependencies [6419b2c]
    - @sap-ux/adp-tooling@0.12.40

## 0.16.51

_Released: 2024-08-20T10:06:29Z_

### Patch Changes

- Updated dependencies [df6262e]
    - @sap-ux/project-access@1.26.8
    - @sap-ux/adp-tooling@0.12.39

## 0.16.50

_Released: 2024-08-19T11:34:45Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.38
- @sap-ux/project-access@1.26.7

## 0.16.49

_Released: 2024-08-19T09:48:14Z_

### Patch Changes

- Updated dependencies [9c8dc5c]
    - @sap-ux/btp-utils@0.15.1
    - @sap-ux/adp-tooling@0.12.37

## 0.16.48

_Released: 2024-08-19T07:45:37Z_

### Patch Changes

- 53a5b13: fix static preview client url

## 0.16.47

_Released: 2024-08-16T14:27:07Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.36

## 0.16.46

_Released: 2024-08-16T10:46:05Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.35

## 0.16.45

_Released: 2024-08-16T06:54:30Z_

### Patch Changes

- Updated dependencies [b813843]
    - @sap-ux/adp-tooling@0.12.34

## 0.16.44

_Released: 2024-08-14T12:04:43Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.33

## 0.16.43

_Released: 2024-08-14T08:37:46Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.32

## 0.16.42

_Released: 2024-08-12T10:50:52Z_

### Patch Changes

- Updated dependencies [82aaea3]
    - @sap-ux/project-access@1.26.6
    - @sap-ux/adp-tooling@0.12.31

## 0.16.41

_Released: 2024-08-08T13:01:35Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.30

## 0.16.40

_Released: 2024-08-08T07:33:51Z_

### Patch Changes

- Updated dependencies [cc16cbb]
    - @sap-ux/project-access@1.26.5
    - @sap-ux/adp-tooling@0.12.29

## 0.16.39

_Released: 2024-08-07T14:42:33Z_

### Patch Changes

- Updated dependencies [593ad0f]
    - @sap-ux/adp-tooling@0.12.28

## 0.16.38

_Released: 2024-08-07T11:06:05Z_

### Patch Changes

- @sap-ux/project-access@1.26.4
- @sap-ux/adp-tooling@0.12.27

## 0.16.37

_Released: 2024-08-07T08:31:04Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.26

## 0.16.36

_Released: 2024-08-06T09:20:51Z_

### Patch Changes

- cea1f9f: Fixed Add XML Fragment dialog not working if there is an unsaved "hideControl" change

## 0.16.35

_Released: 2024-08-02T08:51:32Z_

### Patch Changes

- Updated dependencies [c473d24]
    - @sap-ux/adp-tooling@0.12.25

## 0.16.34

_Released: 2024-08-01T18:27:11Z_

### Patch Changes

- Updated dependencies [88c8bf6]
    - @sap-ux/project-access@1.26.3
    - @sap-ux/adp-tooling@0.12.24

## 0.16.33

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser
- Updated dependencies [e69db46]
    - @sap-ux/project-access@1.26.2
    - @sap-ux/adp-tooling@0.12.23

## 0.16.32

_Released: 2024-08-01T16:21:31Z_

### Patch Changes

- Updated dependencies [a986655]
    - @sap-ux/project-access@1.26.1
    - @sap-ux/adp-tooling@0.12.22

## 0.16.31

_Released: 2024-08-01T14:53:05Z_

### Patch Changes

- Updated dependencies [518bf7e]
    - @sap-ux/project-access@1.26.0
    - @sap-ux/adp-tooling@0.12.21

## 0.16.30

_Released: 2024-08-01T12:24:50Z_

### Patch Changes

- Updated dependencies [99b7b5f]
    - @sap-ux/project-access@1.25.8
    - @sap-ux/adp-tooling@0.12.20

## 0.16.29

_Released: 2024-08-01T10:59:20Z_

### Patch Changes

- Updated dependencies [7ae8207]
    - @sap-ux/adp-tooling@0.12.19

## 0.16.28

_Released: 2024-07-31T14:27:15Z_

### Patch Changes

- cea098a: FIX: regression in adp preview with reuse libs

## 0.16.27

_Released: 2024-07-31T13:34:22Z_

### Patch Changes

- ab2e5a0: Preview support for UI5 2.x

## 0.16.26

_Released: 2024-07-29T11:52:46Z_

### Patch Changes

- Updated dependencies [2a7d3c4]
    - @sap-ux/adp-tooling@0.12.18

## 0.16.25

_Released: 2024-07-25T14:56:14Z_

### Patch Changes

- 42486a5: fix(locate-reuse-lib): corrected extraction of component name

## 0.16.24

_Released: 2024-07-25T12:05:28Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.17

## 0.16.23

_Released: 2024-07-24T12:41:52Z_

### Patch Changes

- ae6a213: fix: hard coded theme in test template

## 0.16.22

_Released: 2024-07-23T09:01:05Z_

### Patch Changes

- Updated dependencies [d549173]
    - @sap-ux/project-access@1.25.7
    - @sap-ux/adp-tooling@0.12.16

## 0.16.21

_Released: 2024-07-22T13:28:51Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.15

## 0.16.20

_Released: 2024-07-18T16:34:38Z_

### Patch Changes

- Updated dependencies [a9fac04]
    - @sap-ux/project-access@1.25.6
    - @sap-ux/adp-tooling@0.12.14

## 0.16.19

_Released: 2024-07-18T14:39:01Z_

### Patch Changes

- Updated dependencies [4c06318]
    - @sap-ux/adp-tooling@0.12.13

## 0.16.18

_Released: 2024-07-18T11:50:01Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.12

## 0.16.17

_Released: 2024-07-18T09:34:40Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.11

## 0.16.16

_Released: 2024-07-18T06:30:32Z_

### Patch Changes

- 90a8291: Extension points break the outline tree sync for apps with UI5 version =< 1.96.33

## 0.16.15

_Released: 2024-07-17T10:08:55Z_

### Patch Changes

- Updated dependencies [421f3ca]
    - @sap-ux/project-access@1.25.5
    - @sap-ux/adp-tooling@0.12.10

## 0.16.14

_Released: 2024-07-15T06:35:23Z_

### Patch Changes

- e0ddba7: Fix potential racing condition in qunit tests

## 0.16.13

_Released: 2024-07-12T15:28:30Z_

### Patch Changes

- Updated dependencies [173b5f2]
    - @sap-ux/project-access@1.25.4
    - @sap-ux/adp-tooling@0.12.9

## 0.16.12

_Released: 2024-07-12T11:17:30Z_

### Patch Changes

- Updated dependencies [9e4ce4d]
    - @sap-ux/adp-tooling@0.12.8

## 0.16.11

_Released: 2024-07-12T09:20:42Z_

### Patch Changes

- Updated dependencies [e7b9184]
    - @sap-ux/project-access@1.25.3
    - @sap-ux/adp-tooling@0.12.7

## 0.16.10

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- 22e4ad8: Generate correct ui5.yaml
- Updated dependencies [22e4ad8]
    - @sap-ux/adp-tooling@0.12.6
    - @sap-ux/project-access@1.25.2

## 0.16.9

_Released: 2024-07-10T14:03:43Z_

### Patch Changes

- 671242b: Disable add fragment and controller extension rt-a menu items if clicked element is from reuse component view

## 0.16.8

_Released: 2024-07-10T13:25:26Z_

### Patch Changes

- cec4a97: Live and Edit buttons are visible as Navigation and UI Adpatation only when in ADP scenario.

## 0.16.7

_Released: 2024-07-10T11:59:21Z_

### Patch Changes

- Updated dependencies [0f3cf6b]
    - @sap-ux/project-access@1.25.1
    - @sap-ux/adp-tooling@0.12.5

## 0.16.6

_Released: 2024-07-10T09:24:19Z_

### Patch Changes

- dbb490a: Add missing test suite default paths to readme

## 0.16.5

_Released: 2024-07-10T08:16:28Z_

### Patch Changes

- Updated dependencies [5f074a7]
    - @sap-ux/adp-tooling@0.12.4

## 0.16.4

_Released: 2024-07-09T12:14:56Z_

### Patch Changes

- Updated dependencies [f076dd3]
    - @sap-ux/project-access@1.25.0
    - @sap-ux/adp-tooling@0.12.3

## 0.16.3

_Released: 2024-07-09T08:05:42Z_

### Patch Changes

- Updated dependencies [0ae685e]
    - @sap-ux/project-access@1.24.0
    - @sap-ux/adp-tooling@0.12.2

## 0.16.2

_Released: 2024-07-08T13:31:31Z_

### Patch Changes

- b2d5843: fix: Missing Scenario API in lower SAPUI5 versions

## 0.16.1

_Released: 2024-07-05T16:16:30Z_

### Patch Changes

- @sap-ux/adp-tooling@0.12.1

## 0.16.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/adp-tooling@0.12.0
    - @sap-ux/btp-utils@0.15.0
    - @sap-ux/logger@0.6.0
    - @sap-ux/project-access@1.23.0

## 0.15.8

_Released: 2024-07-04T09:14:43Z_

### Patch Changes

- 8f57ac28: i18n bindings validation fails for nested \*.properties files

## 0.15.7

_Released: 2024-07-03T10:48:46Z_

### Patch Changes

- Updated dependencies [9ea58ad4]
    - @sap-ux/adp-tooling@0.11.13
    - @sap-ux/project-access@1.22.4

## 0.15.6

_Released: 2024-07-03T08:02:05Z_

### Patch Changes

- Updated dependencies [fa4c088c]
    - @sap-ux/adp-tooling@0.11.12

## 0.15.5

_Released: 2024-07-02T14:54:18Z_

### Patch Changes

- 0e0c2864: Fix Error message regression

## 0.15.4

_Released: 2024-07-02T09:14:08Z_

### Patch Changes

- Updated dependencies [73c741ef]
    - @sap-ux/adp-tooling@0.11.11

## 0.15.3

_Released: 2024-07-02T06:37:55Z_

### Patch Changes

- Updated dependencies [c442d2bc]
    - @sap-ux/adp-tooling@0.11.10

## 0.15.2

_Released: 2024-07-01T14:53:05Z_

### Patch Changes

- @sap-ux/adp-tooling@0.11.9

## 0.15.1

_Released: 2024-07-01T13:51:23Z_

### Patch Changes

- @sap-ux/adp-tooling@0.11.8

## 0.15.0

_Released: 2024-07-01T11:46:28Z_

### Minor Changes

- da2704c7: Add support for using the preview in CAP projects

## 0.14.0

_Released: 2024-06-28T10:44:19Z_

### Minor Changes

- 6ad68964: Enhanced API to support getting list of virtual files and their content

## 0.13.74

_Released: 2024-06-27T07:14:34Z_

### Patch Changes

- Updated dependencies [65bfb244]
    - @sap-ux/adp-tooling@0.11.7

## 0.13.73

_Released: 2024-06-26T14:04:41Z_

### Patch Changes

- fb2ff8d6: Reduce eslint warnings

## 0.13.72

_Released: 2024-06-26T13:30:18Z_

### Patch Changes

- 1a1baeb0: Revert "feat(fiori-elements-writer): remove `sap.fe.templates` dependency
    - @sap-ux/adp-tooling@0.11.6
    - @sap-ux/project-access@1.22.3

## 0.13.71

_Released: 2024-06-26T13:08:21Z_

### Patch Changes

- 899cdb23: FIX: enabled running the middleware with karma

## 0.13.70

_Released: 2024-06-26T11:28:03Z_

### Patch Changes

- @sap-ux/adp-tooling@0.11.5

## 0.13.69

_Released: 2024-06-26T10:58:33Z_

### Patch Changes

- @sap-ux/adp-tooling@0.11.4

## 0.13.68

_Released: 2024-06-25T14:41:22Z_

### Patch Changes

- Updated dependencies [399d2ad8]
    - @sap-ux/project-access@1.22.2
    - @sap-ux/adp-tooling@0.11.3

## 0.13.67

_Released: 2024-06-19T15:33:01Z_

### Patch Changes

- @sap-ux/adp-tooling@0.11.2

## 0.13.66

_Released: 2024-06-18T15:06:09Z_

### Patch Changes

- Updated dependencies [a140cf8b]
    - @sap-ux/adp-tooling@0.11.1
    - @sap-ux/project-access@1.22.1

## 0.13.65

_Released: 2024-06-17T14:16:04Z_

### Patch Changes

- Updated dependencies [7f8bc980]
    - @sap-ux/adp-tooling@0.11.0

## 0.13.64

_Released: 2024-06-14T11:31:19Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.23

## 0.13.63

_Released: 2024-06-13T16:04:23Z_

### Patch Changes

- Updated dependencies [ad93a484]
    - @sap-ux/project-access@1.22.0
    - @sap-ux/adp-tooling@0.10.22

## 0.13.62

_Released: 2024-06-12T15:20:44Z_

### Patch Changes

- 9188fe8b: fpm v4 removed sap.fe.templates in manifest.json, now has dependency on sap.fe.core
  sap.ushell removed from ui5-application-writer, now loaded in fiori-elements and fiori-freestyle writers respectively
    - @sap-ux/adp-tooling@0.10.21
    - @sap-ux/project-access@1.21.2

## 0.13.61

_Released: 2024-06-11T10:45:47Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.20

## 0.13.60

_Released: 2024-06-10T07:24:32Z_

### Patch Changes

- 98b5aaee: Add new model writer has misspelled property that breaks the validation of the change
- Updated dependencies [98b5aaee]
    - @sap-ux/adp-tooling@0.10.19

## 0.13.59

_Released: 2024-06-07T14:16:07Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.18
- @sap-ux/project-access@1.21.1

## 0.13.58

_Released: 2024-06-06T11:57:02Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.17

## 0.13.57

_Released: 2024-06-04T12:43:36Z_

### Patch Changes

- Updated dependencies [69b8d6de]
    - @sap-ux/project-access@1.21.0
    - @sap-ux/adp-tooling@0.10.16

## 0.13.56

_Released: 2024-06-04T12:14:54Z_

### Patch Changes

- Updated dependencies [a7d78229]
    - @sap-ux/project-access@1.20.4
    - @sap-ux/adp-tooling@0.10.15

## 0.13.55

_Released: 2024-06-03T07:02:28Z_

### Patch Changes

- 81026f96: Add explanation at the end of disabled context menu item due to non stable ID

## 0.13.54

_Released: 2024-05-31T14:47:03Z_

### Patch Changes

- c1cc4f57: fix missing RTA toolbar in variant management

## 0.13.53

_Released: 2024-05-31T13:42:35Z_

### Patch Changes

- @sap-ux/project-access@1.20.3
- @sap-ux/adp-tooling@0.10.14

## 0.13.52

_Released: 2024-05-29T14:07:16Z_

### Patch Changes

- Updated dependencies [54c91c6d]
    - @sap-ux/project-access@1.20.2
    - @sap-ux/adp-tooling@0.10.13

## 0.13.51

_Released: 2024-05-29T12:52:41Z_

### Patch Changes

- 52623d36: fix missing support for connect api in flex handler creation

## 0.13.50

_Released: 2024-05-29T09:49:51Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.12

## 0.13.49

_Released: 2024-05-29T09:17:16Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.11

## 0.13.48

_Released: 2024-05-28T14:57:10Z_

### Patch Changes

- 78de7813: RTA standard toolbar replaced with custom CPE toolbar

## 0.13.47

_Released: 2024-05-27T13:04:53Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.10
- @sap-ux/project-access@1.20.1

## 0.13.46

_Released: 2024-05-27T10:02:54Z_

### Patch Changes

- b67b29f5: Generate testsuite for all configured test frameworks

## 0.13.45

_Released: 2024-05-27T09:27:40Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.9

## 0.13.44

_Released: 2024-05-24T10:00:10Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.8

## 0.13.43

_Released: 2024-05-23T07:03:28Z_

### Patch Changes

- 56d8b0b9: Add default content for extension points to the outline in CPE

## 0.13.42

_Released: 2024-05-22T13:22:39Z_

### Patch Changes

- Updated dependencies [6e3d4da4]
    - @sap-ux/adp-tooling@0.10.7

## 0.13.41

_Released: 2024-05-21T08:51:26Z_

### Patch Changes

- 1618da09: Use existing html file on file system for preview

## 0.13.40

_Released: 2024-05-21T08:32:40Z_

### Patch Changes

- da5d9f0b: Fragment files are not created together with an addXML change in onChangeRequest handler
- Updated dependencies [da5d9f0b]
    - @sap-ux/adp-tooling@0.10.6

## 0.13.39

_Released: 2024-05-21T07:52:26Z_

### Patch Changes

- 52faf16f: Fix RTA initialization issue for UI5 versions less than 1.72.

## 0.13.38

_Released: 2024-05-17T10:35:55Z_

### Patch Changes

- 39665ea9: Fix for CPE does not start UI Adaptation for ADP Projects with lower UI5 Version than 1.120

## 0.13.37

_Released: 2024-05-16T08:55:59Z_

### Patch Changes

- 9e8af342: Disable fragment context menu item in CPE for controls with no stable id

## 0.13.36

_Released: 2024-05-15T07:25:15Z_

### Patch Changes

- Updated dependencies [c87fcc91]
    - @sap-ux/adp-tooling@0.10.5

## 0.13.35

_Released: 2024-05-14T08:36:35Z_

### Patch Changes

- Updated dependencies [e3d2324c]
    - @sap-ux/project-access@1.20.0
    - @sap-ux/adp-tooling@0.10.4

## 0.13.34

_Released: 2024-05-14T06:33:50Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.3

## 0.13.33

_Released: 2024-05-14T05:14:21Z_

### Patch Changes

- @sap-ux/adp-tooling@0.10.2

## 0.13.32

_Released: 2024-05-13T14:57:08Z_

### Patch Changes

- Updated dependencies [f361f3b4]
    - @sap-ux/adp-tooling@0.10.1

## 0.13.31

_Released: 2024-05-13T11:37:03Z_

### Patch Changes

- Updated dependencies [9ccbaded]
    - @sap-ux/adp-tooling@0.10.0

## 0.13.30

_Released: 2024-05-10T13:30:56Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.28

## 0.13.29

_Released: 2024-05-10T12:37:23Z_

### Patch Changes

- cad21d4d: Enable Adding Controller Extension only on async views for Adp Projects

## 0.13.28

_Released: 2024-05-08T23:06:17Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.27

## 0.13.27

_Released: 2024-05-07T14:01:29Z_

### Patch Changes

- 4e267684: chore - ejs upgrade
- Updated dependencies [4e267684]
    - @sap-ux/adp-tooling@0.9.26

## 0.13.26

_Released: 2024-05-06T12:14:11Z_

### Patch Changes

- 9a32e102: fix preview reload on SBAS, by exposing livereload server port over url
- Updated dependencies [9a32e102]
    - @sap-ux/btp-utils@0.14.4
    - @sap-ux/adp-tooling@0.9.25

## 0.13.25

_Released: 2024-05-03T11:18:51Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.24

## 0.13.24

_Released: 2024-05-03T07:58:03Z_

### Patch Changes

- 7697dea4: Outsourcing of initialization routine to manage app state from fiori-tools-proxy to preview-middleware-client and updating to UI5 2.0

## 0.13.23

_Released: 2024-05-02T14:43:18Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.23
- @sap-ux/project-access@1.19.14

## 0.13.22

_Released: 2024-04-29T06:40:37Z_

### Patch Changes

- 2e296173: Enable telemetry for adaptation project

## 0.13.21

_Released: 2024-04-26T19:12:20Z_

### Patch Changes

- Updated dependencies [99bca62c]
    - @sap-ux/project-access@1.19.13
    - @sap-ux/adp-tooling@0.9.22

## 0.13.20

_Released: 2024-04-23T22:35:35Z_

### Patch Changes

- Updated dependencies [b7d95fb3]
    - @sap-ux/project-access@1.19.12
    - @sap-ux/adp-tooling@0.9.21

## 0.13.19

_Released: 2024-04-23T12:10:47Z_

### Patch Changes

- 00cf3025: Alternative approach to have a consistent save for XML Fragments
- Updated dependencies [00cf3025]
    - @sap-ux/adp-tooling@0.9.20

## 0.13.18

_Released: 2024-04-23T07:22:50Z_

### Patch Changes

- Updated dependencies [4389c528]
    - @sap-ux/project-access@1.19.11
    - @sap-ux/adp-tooling@0.9.19

## 0.13.17

_Released: 2024-04-23T06:17:08Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.18

## 0.13.16

_Released: 2024-04-18T11:40:00Z_

### Patch Changes

- fc55fd6b: Component Usages writer produces incorrect content of a change
- Updated dependencies [fc55fd6b]
    - @sap-ux/adp-tooling@0.9.17

## 0.13.15

_Released: 2024-04-18T07:12:06Z_

### Patch Changes

- Updated dependencies [f8e16120]
    - @sap-ux/project-access@1.19.10
    - @sap-ux/adp-tooling@0.9.16

## 0.13.14

_Released: 2024-04-17T07:44:37Z_

### Patch Changes

- Updated dependencies [ee76e47f]
    - @sap-ux/project-access@1.19.9
    - @sap-ux/adp-tooling@0.9.15

## 0.13.13

_Released: 2024-04-16T06:40:59Z_

### Patch Changes

- 6291bc37: chore - update dependencies to fix audit warnings
- Updated dependencies [6291bc37]
    - @sap-ux/adp-tooling@0.9.14

## 0.13.12

_Released: 2024-04-15T19:27:29Z_

### Patch Changes

- @sap-ux/project-access@1.19.8
- @sap-ux/adp-tooling@0.9.13

## 0.13.11

_Released: 2024-04-15T16:20:25Z_

### Patch Changes

- Updated dependencies [98496d57]
- Updated dependencies [e3d2e003]
    - @sap-ux/project-access@1.19.7
    - @sap-ux/adp-tooling@0.9.12

## 0.13.10

_Released: 2024-04-12T16:41:43Z_

### Patch Changes

- b17858cc: Support usage when running in connect server like karma

## 0.13.9

_Released: 2024-04-12T08:47:33Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.11

## 0.13.8

_Released: 2024-04-11T09:53:23Z_

### Patch Changes

- 10ce9b44: Fix potential race condition when executing qunit tests

## 0.13.7

_Released: 2024-04-10T11:03:28Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.10

## 0.13.6

_Released: 2024-04-10T08:23:35Z_

### Patch Changes

- 4cbb1639: "Open in VS Code" button for Controller Extension dialog does not work in BAS
- Updated dependencies [4cbb1639]
    - @sap-ux/adp-tooling@0.9.9

## 0.13.5

_Released: 2024-04-04T14:37:58Z_

### Patch Changes

- Updated dependencies [f0e3263a]
    - @sap-ux/project-access@1.19.6
    - @sap-ux/adp-tooling@0.9.8

## 0.13.4

_Released: 2024-04-04T13:19:16Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.7
- @sap-ux/project-access@1.19.5

## 0.13.3

_Released: 2024-04-03T11:49:21Z_

### Patch Changes

- 31ae689d: websocket over https

## 0.13.2

_Released: 2024-03-27T09:13:31Z_

### Patch Changes

- Updated dependencies [87c942e5]
    - @sap-ux/project-access@1.19.4
    - @sap-ux/adp-tooling@0.9.6

## 0.13.1

_Released: 2024-03-26T15:15:06Z_

### Patch Changes

- 25ecdb90: Fix missing title and description on launchpad tile

## 0.13.0

_Released: 2024-03-22T15:44:15Z_

### Minor Changes

- 733fcde8: Allow adding tiles pointing to remote apps

## 0.12.15

_Released: 2024-03-22T08:51:54Z_

### Patch Changes

- 61b46bc8: Security upgrade fixes
- Updated dependencies [61b46bc8]
    - @sap-ux/adp-tooling@0.9.6

## 0.12.14

_Released: 2024-03-21T16:21:01Z_

### Patch Changes

- 6a477fba: feat: Replace auto-refresh with message in case of manual flex file changes
    - @sap-ux/adp-tooling@0.9.5

## 0.12.13

_Released: 2024-03-15T14:41:45Z_

### Patch Changes

- Updated dependencies [4b29ddcc]
    - @sap-ux/adp-tooling@0.9.4

## 0.12.12

_Released: 2024-03-14T16:45:54Z_

### Patch Changes

- 6d76e076: Enhance `preview-middleware` to allow running QUnit and OPA5 tests.

## 0.12.11

_Released: 2024-03-13T08:53:45Z_

### Patch Changes

- 874187b9: Using inbound navigation writer to generate appropriate change files does not produce correct results
- Updated dependencies [874187b9]
    - @sap-ux/adp-tooling@0.9.3

## 0.12.10

_Released: 2024-03-12T14:36:02Z_

### Patch Changes

- fc76be56: do not trigger empty change on focus out

## 0.12.9

_Released: 2024-03-12T09:08:05Z_

### Patch Changes

- 212d54ed: Removed unnecessary peer dependency of the adp-tooling and corrected the integration into the preview-middleware
- Updated dependencies [212d54ed]
    - @sap-ux/adp-tooling@0.9.2

## 0.12.8

_Released: 2024-03-11T10:38:49Z_

### Patch Changes

- dcd3324e: fix on-blur no change for cpe

## 0.12.7

_Released: 2024-03-06T14:41:52Z_

### Patch Changes

- @sap-ux/adp-tooling@0.9.1

## 0.12.6

_Released: 2024-03-06T12:49:42Z_

### Patch Changes

- cf842794: Adds writer functionality for Adaptation Project's manifest change editors
- Updated dependencies [cf842794]
    - @sap-ux/adp-tooling@0.9.0

## 0.12.5

_Released: 2024-03-06T08:22:09Z_

### Patch Changes

- 6c5dba8e: Add reload-middleware

## 0.12.4

_Released: 2024-03-05T13:12:14Z_

### Patch Changes

- 5448433a: FIX: preview path on windows

## 0.12.3

_Released: 2024-02-28T11:01:55Z_

### Patch Changes

- @sap-ux/adp-tooling@0.8.11

## 0.12.2

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json
- Updated dependencies [c15435b6]
    - @sap-ux/adp-tooling@0.8.10
    - @sap-ux/logger@0.5.1

## 0.12.1

_Released: 2024-02-26T14:30:46Z_

### Patch Changes

- Updated dependencies [05953a48]
    - @sap-ux/adp-tooling@0.8.9

## 0.12.0

_Released: 2024-02-23T08:01:15Z_

### Minor Changes

- efd2f6d4: Support ui5 version 1.71.\* in CPE.

### Patch Changes

- @sap-ux/adp-tooling@0.8.8

## 0.11.36

_Released: 2024-02-21T13:16:24Z_

### Patch Changes

- @sap-ux/adp-tooling@0.8.7

## 0.11.35

_Released: 2024-02-21T08:27:44Z_

### Patch Changes

- c05fd77a: Add express in devDependencies

## 0.11.34

_Released: 2024-02-20T12:39:56Z_

### Patch Changes

- @sap-ux/adp-tooling@0.8.6

## 0.11.33

_Released: 2024-02-08T13:37:06Z_

### Patch Changes

- Updated dependencies [2e0b1a6d]
    - @sap-ux/logger@0.5.0
    - @sap-ux/adp-tooling@0.8.5

## 0.11.32

_Released: 2024-02-07T14:23:48Z_

### Patch Changes

- Updated dependencies [2bedc697]
    - @sap-ux/adp-tooling@0.8.4

## 0.11.31

_Released: 2024-02-07T11:10:48Z_

### Patch Changes

- eb0b7b37: Chore - TypeScript 5 upgrade
    - @sap-ux/adp-tooling@0.8.3

## 0.11.30

_Released: 2024-02-06T22:32:34Z_

### Patch Changes

- @sap-ux/adp-tooling@0.8.2

## 0.11.29

_Released: 2024-02-06T09:17:39Z_

### Patch Changes

- @sap-ux/adp-tooling@0.8.1

## 0.11.28

_Released: 2024-02-05T07:10:18Z_

### Patch Changes

- b817c8d5: Property change is created (unsaved) on the key press but should be on blur for the adaptation projects

## 0.11.27

_Released: 2024-01-29T10:58:00Z_

### Patch Changes

- 52265581: Fix styling for the funnel icon on Outline Panel

## 0.11.26

_Released: 2024-01-17T13:38:34Z_

### Patch Changes

- Updated dependencies [349fff1a]
    - @sap-ux/adp-tooling@0.8.0

## 0.11.25

_Released: 2024-01-16T14:33:35Z_

### Patch Changes

- @sap-ux/adp-tooling@0.7.4

## 0.11.24

_Released: 2024-01-16T12:59:00Z_

### Patch Changes

- @sap-ux/adp-tooling@0.7.3

## 0.11.23

_Released: 2024-01-15T08:59:06Z_

### Patch Changes

- 70296b55: Remove label and icon in control property editor

## 0.11.22

_Released: 2023-12-19T15:32:14Z_

### Patch Changes

- 7ce50bbd: "Confirm property change deletion"'s message on delete is only for property changes

## 0.11.21

_Released: 2023-12-19T15:05:28Z_

### Patch Changes

- 83f25073: The extension points not shown as such in the Outline for ADP

## 0.11.20

_Released: 2023-12-15T08:21:23Z_

### Patch Changes

- 132ce16d: Do not block app loading if registering of reuse libs fails

## 0.11.19

_Released: 2023-12-14T10:25:59Z_

### Patch Changes

- e224bc43: Exclude reuse libraries from being added to the data-sap-ui-libs

## 0.11.18

_Released: 2023-12-13T13:14:14Z_

### Patch Changes

- b7f73026: FIX: appdescr changes that require client-side merging are not applied

## 0.11.17

_Released: 2023-12-13T11:52:06Z_

### Patch Changes

- 9e7cbe8e: Disable manually inserting values in dropdowns

## 0.11.16

_Released: 2023-12-08T15:48:19Z_

### Patch Changes

- a714d53d: No unsaved change shown when adding fragment to Extension Point

## 0.11.15

_Released: 2023-12-08T14:54:20Z_

### Patch Changes

- a44e9007: Invalid target aggregation and index are accepted in Add Fragment dialog

## 0.11.14

_Released: 2023-12-06T11:31:29Z_

### Patch Changes

- 338fe503: Add integration test

## 0.11.13

_Released: 2023-12-01T12:26:19Z_

### Patch Changes

- 733cec7b: No Datetime is shown for Code Ext changes in saved changes panel

## 0.11.12

_Released: 2023-12-01T09:42:31Z_

### Patch Changes

- ff457bef: Controller Extension and Fragment name now show error if there is a whitespace after their name

## 0.11.11

_Released: 2023-12-01T08:12:22Z_

### Patch Changes

- 76c751be: Save button for ui5 versions lower than 1.110 is shown

## 0.11.10

_Released: 2023-11-29T20:16:25Z_

### Patch Changes

- Updated dependencies [5a1eb6ed]
    - @sap-ux/adp-tooling@0.7.2

## 0.11.9

_Released: 2023-11-29T15:44:12Z_

### Patch Changes

- 5077d95f: Hide feedback and close buttons for adp projects

## 0.11.8

_Released: 2023-11-29T14:45:41Z_

### Patch Changes

- b4081d0a: Show warning message for adaptation project if ui5 version is less than 1.71

## 0.11.7

_Released: 2023-11-28T13:06:51Z_

### Patch Changes

- 237e69d1: Fix for missing delete icon for new comp/control variant views

## 0.11.6

_Released: 2023-11-28T10:54:29Z_

### Patch Changes

- a280785d: Fix for showing redundant warning dialog in CPE for adaptation projects

## 0.11.5

_Released: 2023-11-28T07:54:47Z_

### Patch Changes

- b5eb0792: Index field is disabled when aggregation with specialIndexHandling is chosen

## 0.11.4

_Released: 2023-11-24T13:24:36Z_

### Patch Changes

- 02609800: Fix for comp/control variant changes not updating in pending changes tab

## 0.11.3

_Released: 2023-11-24T08:39:41Z_

### Patch Changes

- Updated dependencies [de818954]
    - @sap-ux/adp-tooling@0.7.1

## 0.11.2

_Released: 2023-11-22T08:53:28Z_

### Patch Changes

- Updated dependencies [3f977f21]
    - @sap-ux/adp-tooling@0.7.0

## 0.11.1

_Released: 2023-11-15T07:35:31Z_

### Patch Changes

- 18c9d967: Add validation for property changes for i18n models

## 0.11.0

_Released: 2023-11-13T14:11:36Z_

### Minor Changes

- 793f846b: Open existing controller from project files instead of creating a new one

### Patch Changes

- Updated dependencies [793f846b]
    - @sap-ux/adp-tooling@0.6.0

## 0.10.7

_Released: 2023-11-13T13:37:19Z_

### Patch Changes

- 061a6544: CPE UI is not updated when changes are saved or deleted

## 0.10.6

_Released: 2023-11-13T08:06:13Z_

### Patch Changes

- @sap-ux/adp-tooling@0.5.5

## 0.10.5

_Released: 2023-11-10T14:30:35Z_

### Patch Changes

- dc2f9345: Outline tree for Fiori applications is not collapsed correctly

## 0.10.4

_Released: 2023-11-10T11:42:00Z_

### Patch Changes

- be8e3fb3: fix outline initialisation for the case when application is loaded, but outline is empty

## 0.10.3

_Released: 2023-11-09T16:10:49Z_

### Patch Changes

- @sap-ux/adp-tooling@0.5.4

## 0.10.2

_Released: 2023-11-08T11:15:50Z_

### Patch Changes

- e2b264c2: Make Control Property Editor aware which application (scenario) its running in the iframe

## 0.10.1

_Released: 2023-11-07T12:44:34Z_

### Patch Changes

- ca61803e: Fixed controller extension/fragment name longer than 64 chars error not showing up

## 0.10.0

_Released: 2023-11-06T16:53:10Z_

### Minor Changes

- 6d2d2255: support all kind of changes from command stack

## 0.9.0

_Released: 2023-11-03T13:38:39Z_

### Minor Changes

- 318e040e: Enables creation of XML fragments for Extension Points from the outline tree (when right-clicking on extension point) or from the application (when clicking on control).

## 0.8.7

_Released: 2023-10-31T16:47:51Z_

### Patch Changes

- 8d16d0b3: Exports FlpConfig and RtaConfig types for usage in @sap/ux-ui5-tooling

## 0.8.6

_Released: 2023-10-25T10:10:33Z_

### Patch Changes

- @sap-ux/adp-tooling@0.5.3

## 0.8.5

_Released: 2023-10-24T16:06:12Z_

### Patch Changes

- 942f7752: Fixes the configuration of the LocalStorageConnector to avoid conflicts with the WorkspaceConnector

## 0.8.4

_Released: 2023-10-23T15:39:44Z_

### Patch Changes

- 96b115d8: Exports the initAdp function so that can be use in @sap/ux-ui5-tooling

## 0.8.3

_Released: 2023-10-23T07:22:27Z_

### Patch Changes

- 5f90873d: The features for all adaptation projects which are loaded from "WorkspaceConnector" in "preview-middleware-client" are with "isVariantAdaptationEnabled=true".

## 0.8.2

_Released: 2023-10-20T09:47:31Z_

### Patch Changes

- Updated dependencies [aa2ff95b]
    - @sap-ux/adp-tooling@0.5.2

## 0.8.1

_Released: 2023-10-19T14:36:06Z_

### Patch Changes

- @sap-ux/adp-tooling@0.5.1

## 0.8.0

_Released: 2023-10-19T12:06:19Z_

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

- Updated dependencies [1aa0fc43]
    - @sap-ux/adp-tooling@0.5.0
    - @sap-ux/logger@0.4.0

## 0.7.14

_Released: 2023-10-18T13:59:49Z_

### Patch Changes

- @sap-ux/adp-tooling@0.4.5

## 0.7.13

_Released: 2023-10-18T08:27:53Z_

### Patch Changes

- b6e925f8: Adds local persistence of personalizations across local preview sessions

## 0.7.12

_Released: 2023-10-17T08:28:48Z_

### Patch Changes

- 4052822f: Corrected license reference in package.json (no license change)
- Updated dependencies [4052822f]
    - @sap-ux/logger@0.3.9
    - @sap-ux/adp-tooling@0.4.4

## 0.7.11

_Released: 2023-10-16T17:12:59Z_

### Patch Changes

- @sap-ux/adp-tooling@0.4.3

## 0.7.10

_Released: 2023-10-16T09:28:25Z_

### Patch Changes

- aef0ccf3: Add bindingString prop for getBindingInfo expression to support maintenance version

## 0.7.9

_Released: 2023-10-11T13:03:19Z_

### Patch Changes

- 59167357: Adds sap.ui.rta to preload libs for variants management and adaptation projects

## 0.7.8

_Released: 2023-10-10T12:56:04Z_

### Patch Changes

- 913e2a53: support createRenderer method for maintenance versions

## 0.7.7

_Released: 2023-10-09T17:37:13Z_

### Patch Changes

- @sap-ux/adp-tooling@0.4.2

## 0.7.6

_Released: 2023-10-09T05:48:20Z_

### Patch Changes

- Updated dependencies [5747ca18]
    - @sap-ux/adp-tooling@0.4.1

## 0.7.5

_Released: 2023-10-05T14:55:15Z_

### Patch Changes

- 8029360f: Add favicon for CPE and generator for variant-config

## 0.7.4

_Released: 2023-10-02T11:21:02Z_

### Patch Changes

- Updated dependencies [b023f4cb]
    - @sap-ux/adp-tooling@0.4.0

## 0.7.3

_Released: 2023-09-29T05:47:52Z_

### Patch Changes

- 9d0140fa: Make express peer dependency
- Updated dependencies [9d0140fa]
    - @sap-ux/adp-tooling@0.3.4

## 0.7.2

_Released: 2023-09-25T15:52:06Z_

### Patch Changes

- 4f2d9ed8: Bump packages to release the dep fix
- Updated dependencies [4f2d9ed8]
    - @sap-ux/adp-tooling@0.3.3

## 0.7.1

_Released: 2023-09-25T13:57:39Z_

### Patch Changes

- b3baa9a1: Fixes/removes the express dependency
- Updated dependencies [b3baa9a1]
    - @sap-ux/adp-tooling@0.3.2

## 0.7.0

_Released: 2023-09-22T14:23:47Z_

### Minor Changes

- 0f2ac46a: Added support for running an editor with SAPUI5 adaptation projects

## 0.6.3

_Released: 2023-09-21T16:12:10Z_

### Patch Changes

- 555c0ac5: Disable unsupported mode to prevent incorrect changes

## 0.6.2

_Released: 2023-09-21T14:39:30Z_

### Patch Changes

- 0798e88e: Improving the FLP init script

## 0.6.1

_Released: 2023-09-20T15:32:03Z_

### Patch Changes

- @sap-ux/adp-tooling@0.3.1

## 0.6.0

_Released: 2023-09-20T14:21:57Z_

### Minor Changes

- ac0adb21: Enhancing the preview-middleware with new functionality such as adding an XML Fragment (creating "addXML" change).

### Patch Changes

- Updated dependencies [ac0adb21]
    - @sap-ux/adp-tooling@0.3.0

## 0.5.7

_Released: 2023-09-20T13:13:51Z_

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build
- Updated dependencies [63c698a8]
    - @sap-ux/adp-tooling@0.2.5
    - @sap-ux/logger@0.3.8

## 0.5.6

_Released: 2023-09-20T12:48:57Z_

### Patch Changes

- 30825ea6: Add an option for setting the UI5 theme

## 0.5.5

_Released: 2023-09-20T09:01:40Z_

### Patch Changes

- 58424e73: chore(deps): update dependency @ui5/cli to v3.6.0

## 0.5.4

_Released: 2023-09-19T16:14:25Z_

### Patch Changes

- @sap-ux/adp-tooling@0.2.4

## 0.5.3

_Released: 2023-09-19T15:51:30Z_

### Patch Changes

- @sap-ux/adp-tooling@0.2.3

## 0.5.2

_Released: 2023-09-19T15:06:34Z_

### Patch Changes

- @sap-ux/adp-tooling@0.2.2

## 0.5.1

_Released: 2023-09-19T14:02:55Z_

### Patch Changes

- @sap-ux/adp-tooling@0.2.1

## 0.5.0

_Released: 2023-09-12T13:07:12Z_

### Minor Changes

- 62148b07: Breaking change: separating preview from edit mode

### Patch Changes

- Updated dependencies [62148b07]
    - @sap-ux/adp-tooling@0.2.0

## 0.4.5

_Released: 2023-09-08T14:35:37Z_

### Patch Changes

- @sap-ux/adp-tooling@0.1.8

## 0.4.4

_Released: 2023-09-07T10:40:29Z_

### Patch Changes

- a73935c5: No change of functionality, just converted the init script to typescript

## 0.4.3

_Released: 2023-09-05T14:24:57Z_

### Patch Changes

- 9096d8cb: Cleaner FLP sandbox init script

## 0.4.2

_Released: 2023-09-01T07:49:28Z_

### Patch Changes

- @sap-ux/adp-tooling@0.1.7

## 0.4.1

_Released: 2023-08-30T07:41:35Z_

### Patch Changes

- 86f01c39: Log a warning if the preview middleware is used with a path that also exists in the filesystem

## 0.4.0

_Released: 2023-08-28T14:42:47Z_

### Minor Changes

- 4b906238: Preview html is shown in CAP project using cds-plugin-ui5@0.4.0

## 0.3.9

_Released: 2023-08-24T15:31:47Z_

### Patch Changes

- @sap-ux/adp-tooling@0.1.6

## 0.3.8

_Released: 2023-08-22T07:30:39Z_

### Patch Changes

- 44df3d5c: fix lint warnings in locate-reuse-libs.js

## 0.3.7

_Released: 2023-08-17T15:39:52Z_

### Patch Changes

- 29179b5f: Add SAP icon loading in flpsandbox.html

## 0.3.6

_Released: 2023-08-11T10:26:43Z_

### Patch Changes

- @sap-ux/adp-tooling@0.1.5

## 0.3.5

_Released: 2023-08-11T09:14:46Z_

### Patch Changes

- @sap-ux/adp-tooling@0.1.4

## 0.3.4

_Released: 2023-08-10T12:54:14Z_

### Patch Changes

- @sap-ux/adp-tooling@0.1.3

## 0.3.3

_Released: 2023-08-08T09:21:00Z_

### Patch Changes

- Updated dependencies [a256cd54]
    - @sap-ux/adp-tooling@0.1.2

## 0.3.2

_Released: 2023-08-07T12:11:49Z_

### Patch Changes

- 99e84511: FIX: use relative path to app to work with cds-plugin-ui5 in CAP projects

## 0.3.1

_Released: 2023-08-02T13:52:19Z_

### Patch Changes

- 68ef7224: FIX: local artifacts like controller extensions are not loaded
- Updated dependencies [68ef7224]
    - @sap-ux/adp-tooling@0.1.1

## 0.3.0

_Released: 2023-08-01T13:39:52Z_

### Minor Changes

- f13aabe6: export FlpSandbox class for programmatic use of the middleware

## 0.2.0

_Released: 2023-07-20T22:24:17Z_

### Minor Changes

- d2fd9a58: Feature: support for SAP UI5 adaptation projects added

### Patch Changes

- Updated dependencies [d2fd9a58]
    - @sap-ux/adp-tooling@0.1.0

## 0.1.0

### Minor Changes

- d2428273: Initial version of a middleware for previewing applications in a local FLP.
