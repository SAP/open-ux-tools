# Version Overrides

This document lists the version overrides for vulnerable (nested) dependencies and the reason.

## @ui5/cli -> @ui5/server -> router

- waiting on UI5 fixes to be released
- may be necessary to upgrade to version 4 of the UI5 cli

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ path-to-regexp outputs backtracking regular            │
│                     │ expressions                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ path-to-regexp                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <0.1.10                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=0.1.10                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages\preview-middleware-client > @ui5/cli@3.8.0 >  │
│                     │ @ui5/server@3.1.5 > router@1.3.8 >                     │
│                     │ path-to-regexp@0.1.7                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-9wv6-86v2-598j      │
└─────────────────────┴────────────────────────────────────────────────────────┘
```
