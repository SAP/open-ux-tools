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

Fix not available yet with latest @nrwl/nx-cloud

┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ follow-redirects' Proxy-Authorization header kept      │
│                     │ across hosts                                           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ follow-redirects                                       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <=1.15.5                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=1.15.6                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ . > @nrwl/nx-cloud@16.5.2 > nx-cloud@16.5.2 >          │
│                     │ axios@1.6.1 > follow-redirects@1.15.4                  │
│                     │                                                        │
│                     │ . > nx@16.4.0 > axios@1.6.1 > follow-redirects@1.15.4  │
│                     │                                                        │
│                     │ examples\odata-cli >                                   │
│                     │ @sap-ux/axios-extension@link:../../packages/axios-     │
│                     │ extension >                                            │
│                     │ @sap-ux/btp-utils@link:../../packages/btp-utils >      │
│                     │ axios@1.6.1 > follow-redirects@1.15.4                  │
│                     │                                                        │
│                     │ ... Found 72 paths, run `pnpm why follow-redirects`    │
│                     │ for more information                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-cxjh-pqwp-8mfp      │
└─────────────────────┴────────────────────────────────────────────────────────┘

`follows-redirects upgrade` achieved by `axios` upgrade to 1.6.8

No fix for `@sap/bas-sdk` to upgrade `axios` to get the latest `follow-redirects` yet.

No fix available for `http-proxy` to upgrade to latest `follow-redirects`

┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ NPM IP package incorrectly identifies some private IP  │
│                     │ addresses as public                                    │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ ip                                                     │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ =2.0.0                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=2.0.1                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages\ui-components > storybook@7.4.3 >             │
│                     │ @storybook/cli@7.4.3 > @storybook/core-server@7.4.3 >  │
│                     │ ip@2.0.0                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-78xj-cgh5-2h22      │
└─────────────────────┴────────────────────────────────────────────────────────┘

`socks` updated to no longer use `ip`, but `socks-proxy-agent` not upgraded to use the latest `socks`

`@storybook/core-server` involves major version upgrade to consume the `ip` module fix

┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ Path traversal in webpack-dev-middleware               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ webpack-dev-middleware                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=6.0.0 <6.1.2                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=6.1.2                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages/ui-components >                               │
│                     │ @storybook/react-webpack5@7.4.3 >                      │
│                     │ @storybook/builder-webpack5@7.4.3 >                    │
│                     │ webpack-dev-middleware@6.1.1                           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-wr3j-pwj9-hqq6      │
└─────────────────────┴────────────────────────────────────────────────────────┘

No fix available for `@storybook/builder-webpack5` to upgrade to latest `webpack-dev-middleware`

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