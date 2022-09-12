# Version Overrides
This document lists the version overrides for vulnerable (nested) dependencies and the reason.

## vm2
| Override:           | >=3.9.11 |
|:--------------------| :-------------|
|                     | |
| **critical**        | Sandbox Escape in vm2 |
| Package             | vm2 |
| Vulnerable versions | <3.9.11 |
| Patched versions    | >=3.9.11 |
| More info           | https://github.com/patriksimek/vm2/security/advisories/GHSA-mrgp-mrhc-5jrq |

Follow up: `vm2` is a dependency of `json-merger` that is used in `@sap-ux/ui5-application-writer`. Once a new version of `json-writer` without the vulnerable dependency is available, it is to be used and this override can be removed.
