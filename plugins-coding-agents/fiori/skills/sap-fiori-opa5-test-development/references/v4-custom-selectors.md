# V4 Custom Selectors

**Lookup order when writing any journey step:**
1. Check `references/v4-standard-patterns.md` for a ready-made snippet.
2. If not there, check `references/v4-sap-fe-test-api-guide.md` for a standard API method.
3. Only if no standard API covers it, use a custom page object method.

> Reading the page object to understand the app is fine. But if you find a custom method there, do NOT use it in preference to a standard API method that covers the same scenario — custom methods exist to fill gaps, not to replace standard ones.

> **TypeScript note:** All examples below use `sap.ui.define` (JavaScript). The same patterns apply in TypeScript - replace `sap.ui.define([...], function(...) {})` with ES module imports, e.g. `import OpaBuilder from "sap/ui/test/OpaBuilder"` and `import Press from "sap/ui/test/actions/Press"`. The selector logic itself is identical.

---

## OpaBuilder vs Raw `waitFor`

Prefer OpaBuilder (`sap.ui.test.OpaBuilder`, available since UI5 1.74) over raw `waitFor`. It produces cleaner code and generates readable success/failure messages automatically via `.description()`.

```javascript
// ✅ Preferred - OpaBuilder
iClickMyButton: function() {
    return OpaBuilder.create(this)
        .hasType("sap.m.Button")
        .hasProperties({ text: "My Button" })
        .doPress()
        .description("Pressing My Button")
        .execute();
},

iSeeCustomBanner: function(expectedText) {
    return OpaBuilder.create(this)
        .hasType("sap.m.MessageStrip")
        .has(function(oControl) { return oControl.getText() === expectedText; })
        .description("Custom banner visible: " + expectedText)
        .execute();
}

// ❌ Acceptable but verbose - raw waitFor
iClickMyButton: function() {
    return this.waitFor({
        controlType: "sap.m.Button",
        properties: { text: "My Button" },
        actions: new Press(),
        errorMessage: "Could not find My Button"
    });
}
```

### OpaBuilder - conditional action on aggregation items

```javascript
// Select all unselected list items
OpaBuilder.create(this)
    .hasType("sap.m.CustomListItem")
    .doConditional(
        OpaBuilder.Matchers.properties({ selected: false }),
        OpaBuilder.Actions.press()
    )
    .description("Selecting all unselected items")
    .execute();
```

---

## CustomFilterField - Runtime ID Pattern

The annotation path does NOT appear in the runtime control ID. Only the `CustomFilterField` key is used.

```javascript
// ❌ Wrong - annotation path in ID doesn't exist at runtime
var IdBase = "{appId}::{pageId}--fe::FilterBar::{entitySet}::CustomFilterField::MyFilterKey";

// ✅ Correct - runtime ID uses only the CustomFilterField key
var IdBase = "{appId}::{pageId}--MyFilterKey";
// Full inner control ID: IdBase + "--{innerControlId}"
// Always verify the actual ID in the browser debugger before coding it.
```

---

## Opening `sap.m.Select` inside a CustomFilterField

Use `idSuffix: "arrow"` on the `Press` action to click the dropdown arrow.

`waitFor.id` is the SAPUI5 control ID; `Press.idSuffix` is a DOM child suffix - these are independent concepts.

```javascript
this.waitFor({
    id: IdBase + "--MRPElement",
    actions: new Press({ idSuffix: "arrow" })  // "arrow" opens the dropdown
});
```

---

## Avoiding the Double-Suffix Bug with `EnterText`

When the target control ID already ends in `-inner`, do NOT add `idSuffix: "inner"` to `EnterText`. That appends a second `-inner`, producing `-inner-inner` which does not exist in the DOM.

```javascript
// ❌ Wrong - creates <id>-inner-inner, which doesn't exist
this.waitFor({
    id: "...::FilterField::SalesDocument-inner",
    actions: new EnterText({ idSuffix: "inner", text: value })
});

// ✅ Correct - id already targets the inner input; no idSuffix needed
this.waitFor({
    id: "...::FilterField::SalesDocument-inner",
    actions: new EnterText({ text: value })
});
```

---

## ComboBox Item Selection

`sap.ui.core.ListItem` is not rendered inside the ComboBox popup. The popup renders `sap.m.StandardListItem` - match by its `title` property (the resolved i18n text).

```javascript
// ❌ Wrong - sap.ui.core.ListItem is not in the popup DOM
this.waitFor({
    controlType: "sap.ui.core.ListItem",
    matchers: new PropertyStrictEquals({ name: "key", value: "YES_TEXT" }),
    searchOpenDialogs: true,
    actions: new Press()
});

// ✅ Correct - two steps: open the dropdown, then click the rendered list item
// Step 1: open the dropdown
this.waitFor({
    id: "...--MyComboBox",
    actions: new Press({ idSuffix: "arrow" }),
    errorMessage: "ComboBox not found"
});
// Step 2: click the rendered StandardListItem
this.waitFor({
    controlType: "sap.m.StandardListItem",
    matchers: new PropertyStrictEquals({ name: "title", value: "Yes" }),  // resolved i18n text
    searchOpenDialogs: true,
    actions: new Press(),
    errorMessage: "ComboBox item not found"
});
```

---

## Custom Extension Sections

When an Object Page extension section (defined via `manifest.json` `content.body.sections`) contains a hand-authored fragment (e.g. using `macros:Field` or `macros:FormElement` building blocks, or any other custom content), the standard `onForm({ section: "..." })` and `iCheckField({ property: "..." })` identifiers **do not work** because:

1. `onForm({ section: "SectionId" })` resolves to `fe::FacetSubSection::SectionId` — but custom extension subsections use `fe::CustomSubSection::SectionId`. The anchor is never found.
2. `iCheckField({ property: "PropertyName" })` looks for a `FormElement` with an auto-generated ID ending in `FormElement::DataField::PropertyName`. In a custom fragment the form elements have explicit hand-authored IDs — so the regex never matches.

**Solution: use string labels for both identifiers.**

Both `onForm(string)` and `iCheckField(string)` fall back to label-text matching in the `sap.fe.test` internals (`createFormElementMatcher` and `createFieldMatcher` in `BaseAPI.js`):
- `onForm(string)` matches a `sap.uxap.ObjectPageSubSection` by its `title` property — this is the section's display title from the manifest.
- `iCheckField(string)` matches a `sap.ui.layout.form.FormElement` by its label text — this is the field's `Common.Label` from the OData metadata (or i18n text).

```javascript
// ✅ Correct for custom extension sections
Then.onTheObjectPage
    .onForm("Breakout Section #2")          // section display title (manifest "title" value)
    .iCheckField("Journal Entry");           // field label from Common.Label annotation

Then.onTheObjectPage
    .onForm("Breakout Section #2")
    .iCheckField("Business Area");

Then.onTheObjectPage
    .onForm("Breakout Section #2")
    .iCheckField("Amount in Transaction Currency");
```

```javascript
// ❌ Fails for custom extension sections — IDs don't match
Then.onTheObjectPage
    .onForm({ section: "ExtensionSection2" })
    .iCheckField({ property: "AccountingDocument" });
```

**How to find the correct label strings:**
- Open `localService/mainService/metadata.xml` and search for `Annotations Target="...EntityType/PropertyName"` → read the `Common.Label` `String` value.
- For fields without a `Common.Label`, the label is derived from the property name itself or from an i18n key — check the fragment and the i18n file.

**Note on duplicate labels:** If two fields in the same section share the same label, `iCheckField("Label")` will match the first one found. This is usually sufficient to verify the field is present; distinguishing between the two requires a custom OpaBuilder selector (see OpaBuilder section above).

To press an active title link (e.g. a material name that opens a quick view), use `idSuffix: "title"` on the `Press` action.

```javascript
this.waitFor({
    controlType: "sap.m.ObjectIdentifier",
    matchers: new PropertyStrictEquals({ name: "title", value: "MATERIAL-001" }),
    actions: new Press({ idSuffix: "title" }),
    errorMessage: "ObjectIdentifier title link not found"
});
```
