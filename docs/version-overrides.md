# Version Overrides
This document lists the version overrides for vulnerable (nested) dependencies and the reason.


```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ @adobe/css-tools Regular Expression Denial of Service  │
│                     │ (ReDOS) while Parsing CSS                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ @adobe/css-tools                                       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <4.3.1                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=4.3.1                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages/ui-components >                               │
│                     │ @testing-library/jest-dom@5.17.0 >                     │
│                     │ @adobe/css-tools@4.0.1                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-hpx4-r86g-5jrg      │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

:warning: Attention :warning: 
* `@adobe/css-tools`` is used in packages/ui-components > `@testing-library/jest-dom`, which can't be updated to the very latest version due peer dependency to react 18.

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ Axios Cross-Site Request Forgery Vulnerability         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ axios                                                  │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=0.8.1 <1.6.0                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=1.6.0                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ . > @nrwl/nx-cloud@16.5.2 > nx-cloud@16.5.2 >          │
│                     │ axios@1.1.3                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-wf5p-g6vw-rhxx      │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

Fix not available yet with latest @nrwl/nx-cloud

`follows-redirects upgrade` achieved by `axios` upgrade to 1.6.8

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ Denial of service while parsing a tar file due to lack │
│                     │ of folders count validation                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ tar                                                    │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <6.2.1                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=6.2.1                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ . > @nrwl/nx-cloud@18.0.0 > nx-cloud@18.0.0 >          │
│                     │ tar@6.1.11                                             │
│                     │                                                        │
│                     │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ pacote@15.2.0 > @npmcli/run-script@6.0.2 >             │
│                     │ node-gyp@9.4.0 > make-fetch-happen@11.1.1 >            │
│                     │ cacache@17.1.3 > tar@6.1.15                            │
│                     │                                                        │
│                     │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ pacote@15.2.0 > @npmcli/run-script@6.0.2 >             │
│                     │ node-gyp@9.4.0 > tar@6.1.15                            │
│                     │                                                        │
│                     │ ... Found 17 paths, run `pnpm why tar` for more        │
│                     │ information                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-f5x3-32g6-xq36      │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

Fix not available yet with latest @nrwl/nx-cloud

┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ Axios Cross-Site Request Forgery Vulnerability         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ axios                                                  │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=0.8.1 <0.28.0                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=0.28.0                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages/odata-service-inquirer >                      │
│                     │ @sap/wing-service-explorer@1.8.0 > axios@0.21.4        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-wf5p-g6vw-rhxx      │


┌─────────────────────┬────────────────────────────────────────────────────────┐
│ low                 │ fast-xml-parser regex vulnerability patch could be     │
│                     │ improved from a safety perspective                     │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ fast-xml-parser                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ =4.2.4                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=4.2.5                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages/odata-service-inquirer >                      │
│                     │ @sap/wing-service-explorer@1.8.0 >                     │
│                     │ fast-xml-parser@4.2.4                                  │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-gpv5-7x3g-ghjv      │
└─────────────────────┴────────────────────────────────────────────────────────┘

┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ Uncontrolled resource consumption in braces            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ braces                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <3.0.3                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=3.0.3                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ . > @changesets/cli@2.27.7 >                           │
│                     │ @changesets/apply-release-plan@7.0.4 >                 │
│                     │ @changesets/config@3.0.2 >                             │
│                     │ @changesets/get-dependents-graph@2.1.1 >               │
│                     │ @manypkg/get-packages@1.1.3 > globby@11.1.0 >          │
│                     │ fast-glob@3.3.1 > micromatch@4.0.5 > braces@3.0.2      │
│                     │                                                        │
│                     │ . > @changesets/cli@2.27.7 >                           │
│                     │ @changesets/apply-release-plan@7.0.4 >                 │
│                     │ @changesets/config@3.0.2 > @manypkg/get-packages@1.1.3 │
│                     │ > globby@11.1.0 > fast-glob@3.3.1 > micromatch@4.0.5 > │
│                     │ braces@3.0.2                                           │
│                     │                                                        │
│                     │ . > @changesets/cli@2.27.7 >                           │
│                     │ @changesets/apply-release-plan@7.0.4 >                 │
│                     │ @changesets/config@3.0.2 > micromatch@4.0.5 >          │
│                     │ braces@3.0.2                                           │
│                     │                                                        │
│                     │ ... Found 5897 paths, run `pnpm why braces` for more   │
│                     │ information                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-grv7-fg5c-xmjg      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ ws affected by a DoS when handling a request with many │
│                     │ HTTP headers                                           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ ws                                                     │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=8.0.0 <8.17.1                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=8.17.1                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages/ui-components > jest-environment-jsdom@29.7.0 │
│                     │ > jsdom@20.0.3 > ws@8.13.0                             │
│                     │                                                        │
│                     │ packages/ui-components > storybook@8.1.11 >            │
│                     │ @storybook/cli@8.1.11 > @storybook/core-server@8.1.11  │
│                     │ > ws@8.13.0                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-3h5v-q93c-6h6q      │
└─────────────────────┴────────────────────────────────────────────────────────┘