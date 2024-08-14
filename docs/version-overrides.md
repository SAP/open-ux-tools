# Version Overrides
This document lists the version overrides for vulnerable (nested) dependencies and the reason.

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
```
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
└─────────────────────┴────────────────────────────────────────────────────────┘
```
