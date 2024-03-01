---
'@sap-ux/ui-components': patch
---

Fixes for SonarQube issues:
1. Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
1. Refactor this code to not use nested template literals.
1. Remove this property or method or refactor "Class", as "method" is not used inside component body
1. Move this component definition out of the parent component and pass data as props.
1. The signature '(from: number, length?: number | undefined): string' of 'text.substr' is deprecated.
1. Mark the props of the component as read-only.
1. Make this public static property readonly.
1. Prefer using an optional chain expression instead, as it's more concise and easier to read.
1. '{property}' is deprecated.
1. Unnecessary use of boolean literals in conditional expression.
1. useState call is not destructured into value + setter pair
1. Remove this commented out code.
