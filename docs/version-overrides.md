# Version Overrides

This document lists the version overrides for vulnerable (nested) dependencies and the reason.

## Semver Strategy for Security Patch Propagation

The monorepo uses a structured approach to dependency versioning that allows downstream consumers to automatically receive security patches:

### Dependency Categorization

**Category A: Caret (^) Ranges** - Well-maintained packages following semver strictly:
- `axios` - HTTP client with active security maintenance
- `fast-xml-parser` - XML parser with regular CVE patches
- `semver` - Core npm ecosystem package
- `lodash` - Stable utility library
- `ejs` - Template engine with security updates
- `i18next` - Internationalization framework
- `mem-fs` / `mem-fs-editor` - File system abstractions

**Category B: Security Floor (>=) Ranges** - Transitive dependencies with CVE patterns:
- `minimatch` - ReDoS vulnerabilities, floor >=3.1.3
- `tar` / `tar-fs` - Path traversal CVEs
- `form-data` - Weak boundary generation
- `rollup` - Path traversal vulnerability

**Category C: Exact Versions** - Packages requiring version lock:
- `mta-local` - API breaking changes
- `yeoman-generator` - Major API compatibility
- `@sap/*` packages - Internal API contracts

### CVE Reference Table (Last 2 Years)

| Package | CVEs | Severity | Safe Version |
|---------|------|----------|--------------|
| axios | CVE-2025-27152, CVE-2024-39338, CVE-2025-58754 | High | >=1.13.5 |
| fast-xml-parser | CVE-2026-25896, CVE-2024-41818 | Critical/High | >=5.4.1 |
| tar | CVE-2026-26960, CVE-2026-24842 | High | >=7.5.9 |
| tar-fs | CVE-2025-59343, CVE-2024-12905 | High | >=3.0.9 |
| path-to-regexp | CVE-2024-52798, CVE-2024-45296 | High | >=0.1.12 |
| minimatch | CVE-2026-27903, CVE-2022-3517 | High | >=3.1.3 |
| semver | CVE-2022-25883 | High | >=7.6.0 |
| ejs | CVE-2024-33883, CVE-2022-29078 | Mod/Crit | >=3.1.10 |
| rollup | GHSA-mw96-cpmx-2vgc | High | >=4.59.0 |

---

## mta-local

- the sap cloud mta lib is not being maintained and not updating to a newer version of mta-local
- versions of mta-local greater than 1.0.4 will not work because of change of api

## @ui5/cli -> @ui5/server -> router

- waiting on UI5 fixes to be released
- may be necessary to upgrade to version 4 of the UI5 cli when switching up to node 20

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ Unpatched `path-to-regexp` ReDoS in 0.1.x              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ path-to-regexp                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <0.1.12                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=0.1.12                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages\jest-environment-ui5 > @ui5/cli@3.8.0 >       │
│                     │ @ui5/server@3.1.5 > router@1.3.8 >                     │
│                     │ path-to-regexp@0.1.7                                   │
│                     │                                                        │
│                     │ packages\preview-middleware-client > @ui5/cli@3.8.0 >  │
│                     │ @ui5/server@3.1.5 > router@1.3.8 >                     │
│                     │ path-to-regexp@0.1.7                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-rhx6-c78j-4q9w      │
└─────────────────────┴────────────────────────────────────────────────────────┘
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
│ Paths               │ packages\jest-environment-ui5 > @ui5/cli@3.8.0 >       │
│                     │ @ui5/server@3.1.5 > router@1.3.8 >                     │
│                     │ path-to-regexp@0.1.7                                   │
│                     │                                                        │
│                     │ packages\preview-middleware-client > @ui5/cli@3.8.0 >  │
│                     │ @ui5/server@3.1.5 > router@1.3.8 >                     │
│                     │ path-to-regexp@0.1.7                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-9wv6-86v2-598j      │
└─────────────────────┴────────────────────────────────────────────────────────┘

```

## @storybook/addons@7.6.20 -> @storybook/manager-api@7.6.20 -> store2

- need to wait for storybook modules updates
- major storybook version upgrade may be required

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ Cross Site Scripting vulnerability in store2           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ store2                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <2.14.4                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=2.14.4                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ examples\ui-prompting-examples >                       │
│                     │ @storybook/addons@7.6.20 >                             │
│                     │ @storybook/manager-api@7.6.20 > store2@2.14.2          │
│                     │                                                        │
│                     │ packages\ui-prompting > @storybook/addons@7.6.20 >     │
│                     │ @storybook/manager-api@7.6.20 > store2@2.14.2          │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-w5hq-hm5m-4548      │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

##  @sap/bas-sdk@3.11.6 ->  axios@1.8.2 -> form-data@4.0.0

- need to wait for upgrade

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ axios Requests Vulnerable To Possible SSRF and         │                                                                                                                                                                                                                                    
│                     │ Credential Leakage via Absolute URL                    │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ axios                                                  │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=1.0.0 <1.8.2                                         │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=1.8.2                                                │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages\fiori-app-sub-generator >                     │                                                                                                                                                                                                                                    
│                     │ @sap/service-provider-apis@2.1.5 > axios@1.7.4         │                                                                                                                                                                                                                                    
│                     │                                                        │
│                     │ packages\ui-service-sub-generator >                    │                                                                                                                                                                                                                                    
│                     │ @sap/service-provider-apis@2.1.5 > axios@1.7.4         │                                                                                                                                                                                                                                    
│                     │                                                        │
│                     │ packages\ui-service-sub-generator >                    │                                                                                                                                                                                                                                    
│                     │ @sap/subaccount-destination-service-provider@2.4.2 >   │                                                                                                                                                                                                                                    
│                     │ @sap/bas-sdk@3.8.9 > axios@1.7.4                       │                                                                                                                                                                                                                                    
│                     │                                                        │
│                     │ ... Found 4 paths, run `pnpm why axios` for more       │                                                                                                                                                                                                                                    
│                     │ information                                            │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-jr5f-v2jv-69x6      │                                                                                                                                                                                                                                    
└─────────────────────┴────────────────────────────────────────────────────────┘

┌─────────────────────┬────────────────────────────────────────────────────────┐
│ critical            │ form-data uses unsafe random function in form-data for │                                                                                                                                                                                                                                    
│                     │ choosing boundary                                      │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ form-data                                              │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=4.0.0 <4.0.4                                         │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=4.0.4                                                │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ examples\odata-cli >                                   │                                                                                                                                                                                                                                    
│                     │ @sap-ux/axios-extension@link:../../packages/axios-     │                                                                                                                                                                                                                                    
│                     │ extension >                                            │                                                                                                                                                                                                                                    
│                     │ @sap-ux/btp-utils@link:../../packages/btp-utils >      │                                                                                                                                                                                                                                    
│                     │ @sap/bas-sdk@3.11.6 > axios@1.8.2 > form-data@4.0.0    │                                                                                                                                                                                                                                    
│                     │                                                        │
│                     │ examples\odata-cli >                                   │                                                                                                                                                                                                                                    
│                     │ @sap-ux/btp-utils@link:../../packages/btp-utils >      │                                                                                                                                                                                                                                    
│                     │ @sap/bas-sdk@3.11.6 > axios@1.8.2 > form-data@4.0.0    │                                                                                                                                                                                                                                    
│                     │                                                        │
│                     │ examples\simple-generator >                            │                                                                                                                                                                                                                                    
│                     │ @sap-ux/axios-extension@link:../../packages/axios-     │                                                                                                                                                                                                                                    
│                     │ extension >                                            │                                                                                                                                                                                                                                    
│                     │ @sap-ux/btp-utils@link:../../packages/btp-utils >      │                                                                                                                                                                                                                                    
│                     │ @sap/bas-sdk@3.11.6 > axios@1.8.2 > form-data@4.0.0    │                                                                                                                                                                                                                                    
│                     │                                                        │
│                     │ ... Found 724 paths, run `pnpm why form-data` for more │                                                                                                                                                                                                                                    
│                     │ information                                            │                                                                                                                                                                                                                                    
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-fjxv-7rqg-78g4      │                                                                                                                                                                                                                                    
└─────────────────────┴────────────────────────────────────────────────────────┘
```

# ... minimatch@3.0.5 -> brace-expansion@1.1.11

- highly used from test-exclude

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ low                 │ brace-expansion Regular Expression Denial of Service   │
│                     │ vulnerability                                          │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ brace-expansion                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=1.0.0 <=1.1.11                                       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=1.1.12                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ . > @typescript-eslint/eslint-plugin@7.18.0 >          │
│                     │ @typescript-eslint/parser@7.18.0 > eslint@8.56.0 >     │
│                     │ @humanwhocodes/config-array@0.11.14 > minimatch@3.0.5  │
│                     │ > brace-expansion@1.1.11                               │
│                     │                                                        │
│                     │ . > @typescript-eslint/eslint-plugin@7.18.0 >          │
│                     │ @typescript-eslint/type-utils@7.18.0 >                 │
│                     │ @typescript-eslint/utils@7.18.0 > eslint@8.56.0 >      │
│                     │ @humanwhocodes/config-array@0.11.14 > minimatch@3.0.5  │
│                     │ > brace-expansion@1.1.11                               │
│                     │                                                        │
│                     │ . > @typescript-eslint/eslint-plugin@7.18.0 >          │
│                     │ @typescript-eslint/type-utils@7.18.0 > eslint@8.56.0 > │
│                     │ @humanwhocodes/config-array@0.11.14 > minimatch@3.0.5  │
│                     │ > brace-expansion@1.1.11                               │
│                     │                                                        │
│                     │ ... Found 6071 paths, run `pnpm why brace-expansion`   │
│                     │ for more information                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-v6h2-p8h4-qcjw      │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

# ... tar-fs

- waiting on update from other modules

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ tar-fs Vulnerable to Link Following and Path Traversal │
│                     │ via Extracting a Crafted tar File                      │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ tar-fs                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=3.0.0 <3.0.7                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=3.0.7                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages\jest-runner-puppeteer >                       │
│                     │ puppeteer-core@22.12.1 > @puppeteer/browsers@2.2.3 >   │
│                     │ tar-fs@3.0.5                                           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-pq67-2wwv-3xjx      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ tar-fs Vulnerable to Link Following and Path Traversal │
│                     │ via Extracting a Crafted tar File                      │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ tar-fs                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=2.0.0 <2.1.2                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=2.1.2                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ . > prebuild-install@7.0.1 > tar-fs@2.1.1              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-pq67-2wwv-3xjx      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ tar-fs can extract outside the specified dir with a    │
│                     │ specific tarball                                       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ tar-fs                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=3.0.0 <3.0.9                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=3.0.9                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages\jest-runner-puppeteer >                       │
│                     │ puppeteer-core@22.12.1 > @puppeteer/browsers@2.2.3 >   │
│                     │ tar-fs@3.0.5                                           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-8cj5-5rvv-wf4v      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ tar-fs can extract outside the specified dir with a    │
│                     │ specific tarball                                       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ tar-fs                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=2.0.0 <2.1.3                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=2.1.3                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ . > prebuild-install@7.0.1 > tar-fs@2.1.1              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-8cj5-5rvv-wf4v      │
└─────────────────────┴────────────────────────────────────────────────────────┘

```