---
"@sap-ux/ui5-config": minor
"@sap-ux/abap-deploy-config-writer": patch
"@sap-ux/deploy-tooling": patch
---

FIX: derive configuration.exclude from builder.resources.excludes at runtime

Exclude patterns are now matched with glob semantics (`*`, `**`; regex metacharacters are literal) instead of being treated as regular expressions. Existing `configuration.exclude` entries written as regexes should be migrated to globs (e.g. `.*\.map$` → `/**/*.map`); a warning is logged for entries that still look like regular expressions.
