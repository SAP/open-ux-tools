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
