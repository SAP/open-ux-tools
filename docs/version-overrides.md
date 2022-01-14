# Version Overrides
This document lists the version overrides for vulnerable (nested) dependencies and the reason.

## ansi-regex

| Override:           | ^5.0.1 |
|:--------------------| :------------ |
|                     | |
| **moderate**        | Inefficient Regular Expression Complexity in chalk/ansi-regex |
| Vulnerable versions | >2.1.1 <5.0.1 |
| Patched versions    | >=5.0.1 |
| More info           | https://github.com/advisories/GHSA-93q8-gq69-wqmw |

## tmpl

| Override:           | ^1.0.5 |
|:--------------------| :-------------|
|                     | |
| **moderate**        | Regular Expression Denial of Service in tmpl |
| Package             | tmpl |
| Vulnerable versions | <1.0.5 |
| Patched versions    | >=1.0.5 |
| More info           | https://github.com/advisories/GHSA-jgrx-mgxx-jf9v |

## follow-redirects

| Override:           | >=1.14.7 |
|:--------------------| :-------------|
|                     | |
| **high**            | Exposure of sensitive information in follow-redirects |
| Package             | follow-redirects | 
| Vulnerable versions | <1.14.7                                               |
| More info           | https://github.com/advisories/GHSA-74fj-2j2h-c42q     |
