# Version Overrides

This document lists the version overrides for vulnerable (nested) dependencies and the reason.

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

    "@octokit/rest@18": ">=21.1.1"

No fix available yet. Would need to update yeoman-generator@5.10.0 and  github-username@6.0.0

┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ @octokit/request-error has a Regular Expression in     │
│                     │ index that Leads to ReDoS Vulnerability Due to         │
│                     │ Catastrophic Backtracking                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ @octokit/request-error                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=1.0.0 <5.1.1                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=5.1.1                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/core@3.6.0 > @octokit/graphql@4.8.0 >         │
│                     │ @octokit/request@5.6.3 > @octokit/request-error@2.1.0  │
│                     │                                                        │
│                     │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/core@3.6.0 > @octokit/request@5.6.3 >         │
│                     │ @octokit/request-error@2.1.0                           │
│                     │                                                        │
│                     │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/core@3.6.0 > @octokit/request-error@2.1.0     │
│                     │                                                        │
│                     │ ... Found 192 paths, run `pnpm why                     │
│                     │ @octokit/request-error` for more information           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-xx4v-prfh-6cgc      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ @octokit/request has a Regular Expression in           │
│                     │ fetchWrapper that Leads to ReDoS Vulnerability Due to  │
│                     │ Catastrophic Backtracking                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ @octokit/request                                       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=1.0.0 <9.2.1                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=9.2.1                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/core@3.6.0 > @octokit/graphql@4.8.0 >         │
│                     │ @octokit/request@5.6.3                                 │
│                     │                                                        │
│                     │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/core@3.6.0 > @octokit/request@5.6.3           │
│                     │                                                        │
│                     │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/plugin-paginate-rest@2.21.3 >                 │
│                     │ @octokit/core@3.6.0 > @octokit/graphql@4.8.0 >         │
│                     │ @octokit/request@5.6.3                                 │
│                     │                                                        │
│                     │ ... Found 128 paths, run `pnpm why @octokit/request`   │
│                     │ for more information                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-rmvr-2pp2-xj38      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ moderate            │ @octokit/plugin-paginate-rest has a Regular Expression │
│                     │ in iterator Leads to ReDoS Vulnerability Due to        │
│                     │ Catastrophic Backtracking                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ @octokit/plugin-paginate-rest                          │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=1.0.0 <11.4.1                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=11.4.1                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ examples/simple-generator > yeoman-generator@5.10.0 >  │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/plugin-paginate-rest@2.21.3                   │
│                     │                                                        │
│                     │ packages/abap-deploy-config-sub-generator >            │
│                     │ @sap-ux/deploy-config-generator-shared@link:../deploy- │
│                     │ config-generator-shared > yeoman-generator@5.10.0 >    │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/plugin-paginate-rest@2.21.3                   │
│                     │                                                        │
│                     │ packages/abap-deploy-config-sub-generator >            │
│                     │ yeoman-test@6.3.0 > yeoman-generator@5.10.0 >          │
│                     │ github-username@6.0.0 > @octokit/rest@18.12.0 >        │
│                     │ @octokit/plugin-paginate-rest@2.21.3                   │
│                     │                                                        │
│                     │ ... Found 16 paths, run `pnpm why                      │
│                     │ @octokit/plugin-paginate-rest` for more information    │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-h5c3-5r3r-rr8q      │
└─────────────────────┴────────────────────────────────────────────────────────┘