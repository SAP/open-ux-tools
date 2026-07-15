---
"@sap-ux/create": minor
---

FEAT: Add interactive prompting and connection checking for system management commands

- Added interactive prompts for `add system`, `update system`, and `remove system` commands when flags are not provided
- Added connection verification for `add system` and `update system` before saving (with `--skip-check` flag to bypass)
- Added confirmation prompt for `remove system` (with `--force` flag to bypass)
- All commands now support both flag-based and fully interactive modes
- No breaking changes - all existing flag-based usage continues to work
