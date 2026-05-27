---
"@sap-ux/ui-components": patch
---

fix(UITranslationButton): use onCancel for callout onDismiss instead of onToggleCallout

Dismiss should close the callout, not toggle it. Using onToggleCallout on onDismiss
could re-open the callout via stale closure and incorrectly trigger onShowExistingEntry
when the user clicks outside.
