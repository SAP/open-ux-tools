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
* @adobe/css-tools is used in packages/ui-components > @testing-library, which can't be updated to the very latest version due peer dependency to react 18
