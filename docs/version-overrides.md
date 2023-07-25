# Version Overrides
This document lists the version overrides for vulnerable (nested) dependencies and the reason.
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ tough-cookie Prototype Pollution vulnerability         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ tough-cookie                                           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <4.1.3                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=4.1.3                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-72xf-g2v4-qvf3      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ word-wrap vulnerable to Regular Expression Denial of   │
│                     │ Service                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ word-wrap                                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <1.2.4                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=1.2.4                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-j8xg-fqg3-53r7      │
└─────────────────────┴────────────────────────────────────────────────────────┘
## semver
| Override:           | >=7.5.2 |
|:--------------------| :-------------|
|                     | |
| **moderate**        | Regular Expression Denial of Service in semver  |
| Package             | semver |
| Vulnerable versions | <7.5.2 |
| Patched versions    | >=7.5.2 |
| More info           | https://github.com/advisories/GHSA-c2qf-rxjj-qqgw  |

## trim
| Override:           | >=0.0.3 |
|:--------------------| :-------------|
|                     | |
| **high**            | Regular Expression Denial of Service in trim  |
| Package             | trim |
| Vulnerable versions | <0.0.3 |
| Patched versions    | >=0.0.3 |
| More info           | https://github.com/advisories/GHSA-w5p7-h5w8-2hfq  |

## trim-newlines
| Override:           | >=3.0.1 |
|:--------------------| :-------------|
|                     | |
| **high**            | Uncontrolled Resource Consumption in trim-newlines |
| Package             | trim-newlines |
| Vulnerable versions | <3.0.1 |
| Patched versions    | >=3.0.1 |
| More info           | https://github.com/advisories/GHSA-7p7h-4mm5-852v |

## glob-parent
| Override:           | >=5.1.2 |
|:--------------------| :-------------|
|                     | |
| **high**            | glob-parent before 5.1.2 vulnerable to Regular Expression Denial of Service in enclosure regex |
| Package             | glob-parent |
| Vulnerable versions | <5.1.2 |
| Patched versions    | >=5.1.2 |
| More info           | https://github.com/advisories/GHSA-ww39-953v-wcq6   |

:warning: Attention :warning: 
* `trim`, `trim-newlines` and `glob-parent` are dependencies of `storybook` that is used in `@sap-ux/ui-components`. Once a new version without the vulnerable dependency is available, it is to be used and this override can be removed.
* `semver` is used by too many modules. Override can be removed or kept for specific dependencies after we have cleaned up our devDependencies.
* `tough-cookie` no fix available yet for jest-environment-jsdom
*  `word-wrap` no fix available yet for @typescript-eslint/* modules.