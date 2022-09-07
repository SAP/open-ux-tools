# Version Overrides
This document lists the version overrides for vulnerable (nested) dependencies and the reason.

At this moment, no override is required, therefore, this document is empty. If a new override is required in the future, please use the below format.

## Example: ansi-regex

| Override:           | ^5.0.1 |
|:--------------------| :------------ |
|                     | |
| **moderate**        | Inefficient Regular Expression Complexity in chalk/ansi-regex |
| Vulnerable versions | >2.1.1 <5.0.1 |
| Patched versions    | >=5.0.1 |
| More info           | https://github.com/advisories/GHSA-93q8-gq69-wqmw |

