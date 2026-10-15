# @sap-ux/fiori-migration-writer

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
