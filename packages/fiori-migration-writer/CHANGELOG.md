# @sap-ux/fiori-migration-writer

## 0.0.7

### Patch Changes

#### Workspace Updates

- @sap-ux/adp-tooling 1.0.66 → 1.0.67

## 0.0.6

### Patch Changes

#### Release Date

2026-10-23

#### Bug Fixes

- Restore ui5-mock.yaml middleware and targetMockHtmlFile; resolve SonarQube findings and thread mem-fs editor explicitly [[fc7d03d](https://github.com/SAP/open-ux-tools/commit/fc7d03dac8da1434cf14370da953b15edff89439)]

## 0.0.5

### Patch Changes

#### Workspace Updates

- @sap-ux/btp-utils 2.0.7 → 2.0.8
- @sap-ux/adp-tooling 1.0.65 → 1.0.66
- @sap-ux/axios-extension 2.1.2 → 2.1.3
- @sap-ux/nodejs-utils 1.0.11 → 1.0.12

## 0.0.4

### Patch Changes

#### Release Date

2026-10-20

#### Bug Fixes

- Deduplicate project roots to prevent duplicate reuse library detection. Projects with both package.json and pom.xml markers, and libraries with nested manifest.json files, now appear exactly once in migration view. [[4a5825d](https://github.com/SAP/open-ux-tools/commit/4a5825d83dcd3f172e7575864d262e8a5df5fa80)]

## 0.0.3

### Patch Changes

#### Release Date

2026-10-16

#### Bug Fixes

- Resolve pom.xml artifactId placeholder when manifest app ID contains ${project.artifactId},

       Prevent overwriting existing mockserver.js during migration when mem-fs editor context is active
       Load the project folder into mem-fs at migration start so existence checks see untracked files on disk and are not silently overwritten; unify the existence check and simplify readJSON [[4576e3a](https://github.com/SAP/open-ux-tools/commit/4576e3a0ff7b421483ad004bd7556a75a1c9c3e3)]

#### Dependency Updates

- Upgrade fs-extra 11.3.6 → 11.4.1 [[192bae1](https://github.com/SAP/open-ux-tools/commit/192bae152640fb51741f16d77402719d0dde0979)]

#### Workspace Updates

- @sap-ux/adp-tooling 1.0.64 → 1.0.65
- @sap-ux/axios-extension 2.1.1 → 2.1.2
- @sap-ux/btp-utils 2.0.6 → 2.0.7
- @sap-ux/ui5-config 1.0.9 → 1.0.10
- @sap-ux/ui5-info 1.0.6 → 1.0.7
- @sap-ux/i18n 1.0.5 → 1.0.6
- @sap-ux/launch-config 1.0.24 → 1.0.25
- @sap-ux/nodejs-utils 1.0.10 → 1.0.11
- @sap-ux/project-access 2.3.0 → 2.3.1
- @sap-ux/ui5-application-writer 2.1.5 → 2.1.6

## 0.0.2

### Patch Changes

#### Release Date

2026-10-15

#### Bug Fixes

- Exclude sourceTemplate version from snapshot comparison to prevent pipeline failures on version bump [[435329c](https://github.com/SAP/open-ux-tools/commit/435329c6063769e4cb3c39064bcdcbba8ed79279)]

## 0.0.1

### Patch Changes

#### Release Date

2026-10-15

#### Features

- Introduce new @sap-ux/fiori-migration-writer package

    - Add @sap-ux/fiori-migration-writer for programmatic Fiori project migration
      This package provides migration capabilities for Fiori projects, extracted from SAP-internal tools to enable open-source collaboration. Key features:
    - Project migration from WebIDE to modern Fiori tooling
    - Template generation for migrated projects
    - FLP configuration and UI5 tooling setup
    - Support for regular projects, extension projects, adaptation projects, and reuse libraries
    - Comprehensive validation and error handling
      Security improvements:
    - Fix incomplete string escaping in escapeSingleQuotes and escapeDoubleQuotes
    - Fix incomplete pattern replacement in resolveAppIdFromPom
    - Add path validation for git command arguments to prevent shell injection
    - Proper error type handling with instanceof checks [[0410fa1](https://github.com/SAP/open-ux-tools/commit/0410fa113d720274cc2ca2ae89499d853a4046c3)]
