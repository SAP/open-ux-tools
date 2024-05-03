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
