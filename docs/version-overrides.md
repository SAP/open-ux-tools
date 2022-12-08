# Version Overrides
This document lists the version overrides for vulnerable (nested) dependencies and the reason.

## trim
| Override:           | >=0.0.3 |
|:--------------------| :-------------|
|                     | |
| **high**        | Regular Expression Denial of Service in trim  |
| Package             | trim |
| Vulnerable versions | <0.0.3 |
| Patched versions    | >=0.0.3 |
| More info           | https://github.com/advisories/GHSA-w5p7-h5w8-2hfq  |

## trim-newlines
| Override:           | >=3.0.1 |
|:--------------------| :-------------|
|                     | |
| **high**        | Uncontrolled Resource Consumption in trim-newlines |
| Package             | trim-newlines |
| Vulnerable versions | <3.0.1 |
| Patched versions    | >=3.0.1 |
| More info           | https://github.com/advisories/GHSA-7p7h-4mm5-852v |

## glob-parent
| Override:           | >=5.1.2 |
|:--------------------| :-------------|
|                     | |
| **high**        | glob-parent before 5.1.2 vulnerable to Regular Expression Denial of Service in enclosure regex |
| Package             | glob-parent |
| Vulnerable versions | <5.1.2 |
| Patched versions    | >=5.1.2 |
| More info           | https://github.com/advisories/GHSA-ww39-953v-wcq6   |

## minimatch
| Override:           | >=3.0.5 |
|:--------------------| :-------------|
|                     | |
| **high**            | minimatch ReDoS vulnerability                     |
| Package             | minimatch                                         |
| Vulnerable versions | <3.0.5                                            |
| Patched versions    | >=3.0.5                                           |
| More info           | https://github.com/advisories/GHSA-f8q6-p94x-37v3 |

## decode-uri-component
| Override:           | >=0.2.2                                                    |
|:--------------------|:-----------------------------------------------------------|
|                     |                                                            |
| **low**             | decode-uri-component vulnerable to Denial of Service (DoS) |
| Package             | decode-uri-component                                       |
| Vulnerable versions | <=0.2.0                                                    |
| Patched versions    | >=0.2.2                                                    |
| More info           | https://github.com/advisories/GHSA-w573-4hg7-7wgq          |

:warning: Attention :warning: 
* `trim`, `trim-newlines` and `glob-parent` are dependencies of `storybook` that is used in `@sap-ux/ui-components`. Once a new version without the vulnerable dependency is available, it is to be used and this override can be removed.
* the `minimatch` override can be removed as soon as `@sap/bas-sdk` and `pretty-quick` are updated
