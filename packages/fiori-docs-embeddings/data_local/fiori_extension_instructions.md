--------------------------------

**TITLE**: Custom Column Link → Read-Only Popup Displaying OData Navigation Entity (SimpleForm, OData V4 bindElement) ✅ VERIFIED WORKING PATTERN

**INTRODUCTION**: This guide explains how to add a custom column to a Fiori Elements V4 List Report table where a cell renders as a clickable link that opens a read-only dialog showing fields from a navigated associated entity (e.g. a `_RelatedEntity` navigation property on the parent entity). This pattern uses `sap.ui.layout.form.SimpleForm` with `sap.m.Label`/`sap.m.Text` controls and OData V4 `bindElement` to load the associated entity. Follow every critical pitfall below — each one was encountered in real implementations and will cause silent failures if ignored.

Replace all placeholder names with your actual values:
- `my.app` → your app namespace (e.g. `com.mycompany.myapp`)
- `ListReportExt` → your controller extension name
- `LinkedField` → the entity property to display in the column (e.g. `AgencyID`, `CustomerID`)
- `_RelatedEntity` → the OData navigation property name (e.g. `_Agency`, `_Customer`)
- `RelatedEntitySet` → the EntitySet name from `metadata.xml` EntityContainer for the navigation target

**TAGS**: custom column, popup, dialog, SimpleForm, sap.ui.layout.form.SimpleForm, OData V4, bindElement, navigation property, association, controller extension, list report, fragment, link, read-only, data visualization, extension

---

**CRITICAL PITFALL 1 — `sap.fe.macros.Form`, `sap.fe.macros.FormElement`, and `sap.fe.macros.Field` CANNOT be used to display OData-bound data in fragments loaded at runtime via `Fragment.load()`**: These are **template-time building blocks** that depend on SAP Fiori Elements' XML preprocessing pipeline, which runs only during initial FE-managed view rendering — not when a fragment is dynamically loaded at runtime. When used in a `Fragment.load()` dialog bound to OData data (e.g. a navigation entity), they fail with runtime errors such as `TypeError: Cannot read properties of undefined (reading 'getModel')` (thrown from `FormElement.ts`) or attempt to request invalid `__EntityControl` OData paths. The form renders blank or crashes — with no obvious error message at the dialog level. **Always use `sap.ui.layout.form.SimpleForm`** with plain `sap.m.Label` and `sap.m.Text`/`sap.m.Link` controls when displaying OData entity data in a dialog loaded via `Fragment.load()`. This approach has no annotation dependencies, requires no preprocessing pipeline, and reliably works at runtime. The macros:Form + macros:FormElement section further below is marked BROKEN and kept only as a reference for error recognition — do not attempt it.

**CRITICAL PITFALL 2 — Two different event handler prefixes for two different contexts**:
- **In a FE-managed column template fragment** (the Link cell in the table): use the full extension path `.extension.<namespace>.<ControllerName>.<methodName>`. Example: `press=".extension.my.app.ext.controller.ListReportExt.onLinkPress"`. This works because FE's XML template processor resolves this against the List Report view's controller.
- **In a `Fragment.load()` dialog fragment** (the Close button in the popup): use the direct dot-prefix `.methodName` only. Example: `press=".onPopupClose"`. This works because the fragment is loaded with `controller: this` (the extension instance), and method resolution goes directly against that instance. Using `.extension.XXX.onPopupClose` here will silently fail — the button click does nothing and no error is logged.

**CRITICAL PITFALL 3 — Controls in column template fragments MUST have explicit `id` attributes when `flexEnabled: true`**: When `sap.ui5.flexEnabled: true` is set in manifest.json (standard for SAP Fiori Elements apps using variant management/LREP), all controls in column template fragments must have stable `id` attributes. Without them, SAPUI5 Flexibility silently fails to track the controls for adaptation. SAP Fiori Elements handles ID uniqueness across rows by internally prefixing template control IDs with row-specific context keys — so duplicate ID errors do NOT occur with FE-managed column templates. Add `id="myLinkControl"` (or similar) to the Link control in the column template fragment. **Exception — `flexEnabled: false`**: In apps without flexibility enabled, adding a static `id` to column template controls would cause duplicate ID errors (one per row). Check your manifest.json: `"sap.ui5": { "flexEnabled": true }`. Most production SAP Fiori Elements apps have `flexEnabled: true`.

**CRITICAL PITFALL 4 — Use `header` not `label` in the manifest.json column config, and do NOT add `type: "Slot"`**: The correct property for the column header text is `"header"`, not `"label"`. Using `"label"` or adding `"type": "Slot"` causes the column to not appear in the table at all (no error is thrown). Also note that `"header"` accepts i18n binding syntax: `"{i18n>myKey}"`.

**CRITICAL PITFALL 5 — Add `"properties"` to the column config**: When `autoExpandSelect: true` is set in the OData model (standard for FE apps), only explicitly requested properties are fetched. Add `"properties": ["LinkedField"]` (replace with whichever field the column displays) to the column config in manifest.json. Without this, the binding `{LinkedField}` in the template fragment will show empty text.

**CRITICAL PITFALL 6 — Use `this.base.getView()` in a ControllerExtension, not `this.getView()`**: Inside a `sap.ui.core.mvc.ControllerExtension`, `this.getView()` does not exist. Use `this.base.getView()` to get the view instance. This is required for `oView.getId()`, `oView.addDependent()`, etc.

**CRITICAL PITFALL 7 — Create mock data JSON for the navigation target entity set**: When running with a mock server (e.g. `ui5-mock.yaml`), the mock server serves entity sets from JSON files in `localService/mainService/data/`. If the navigation target entity set (e.g. `RelatedEntitySet`) has no corresponding JSON file, the dialog opens but shows empty fields — no error. The mock server determines which JSON file to use for a navigation property by looking at the `NavigationPropertyBinding` `Target` attribute on the parent EntitySet in `metadata.xml`. For example, if `metadata.xml` has `<NavigationPropertyBinding Path="_Agency" Target="TravelAgency" />` on the Travel EntitySet, the mock server will look for `data/TravelAgency.json` when the `_Agency` navigation property is requested. The filename must exactly match the `Target` value (case-sensitive). Check the `EntityContainer` in `metadata.xml` for all `NavigationPropertyBinding` entries on your parent entity set to find the correct target name. Do NOT include stream/media properties (e.g. `Attachment` of type `Edm.Stream`) — they cause mock server errors.

**CRITICAL PITFALL 8 — Provide a unique suffix in the `Fragment.load` `id` parameter**: The `id` passed to `Fragment.load()` is used to prefix all control IDs inside the fragment. Using just `oView.getId()` (no suffix) means all controls get the same prefix as the view itself — this causes ID conflicts when a second fragment is loaded in the same view. Always use a unique, descriptive suffix: `id: oView.getId() + "--relatedEntityPopup"`. This guarantees uniqueness and prevents duplicate-ID errors if the component is reused.

**CRITICAL PITFALL 9 — `macros:Form` crashes with `Cannot create form based on ReferenceURLFacet` when the target entity has a media/stream facet**: When `macros:Form metaPath` points to a navigation property without a FieldGroup qualifier (e.g. `metaPath="_Agency"`), the building block reads `@UI.Facets` for that entity to auto-generate form containers. If any facet is of type `UI.ReferenceURLFacet` (common on entities exposing stream/attachment/media properties), the form throws `Cannot create form based on ReferenceURLFacet` and renders nothing. **Fix**: Add a `@UI.FieldGroup` annotation for the target entity in your local `annotation.xml`, then set `macros:Form metaPath` to explicitly target that FieldGroup: `"_Navigation/@com.sap.vocabularies.UI.v1.FieldGroup#Qualifier"`. This bypasses `@UI.Facets` processing entirely.

**CRITICAL PITFALL 10 — `macros:Form metaPath` must target a FieldGroup with the full annotation path and no leading slash**: The correct format is `metaPath="_NavigationProperty/@com.sap.vocabularies.UI.v1.FieldGroup#Qualifier"`. Common wrong variants: (a) `metaPath="_Agency"` — triggers `@UI.Facets` auto-generation, may hit Pitfall 9; (b) `metaPath="/_Agency/@..."` — leading slash causes path resolution failure; (c) using the short alias in the attribute value (e.g. `@UI.FieldGroup#...`) — only valid inside annotation XML, not in XML fragment attribute values; always use the full namespace `com.sap.vocabularies.UI.v1.FieldGroup` in `metaPath` attribute values.

**CRITICAL PITFALL 11 — `macros:FormElement metaPath` must be a bare property name relative to the navigation target, with NO navigation prefix**: `macros:Form`'s `metaPath` already navigates into the target entity. The child `macros:FormElement` `metaPath` values must therefore be **property names only** (e.g. `metaPath="Name"`), not `metaPath="_Agency/Name"`. Using the navigation prefix creates a double-navigation OData path (e.g. `/_Agency/_Agency/Name`) and causes the error `_Agency/_Agency/Name does not point to a property`. Strip all navigation prefixes from FormElement `metaPath` values — they are resolved relative to the Form's navigation target.

**CRITICAL PITFALL 12 — Bind the dialog to the PARENT entity path, NOT to the navigation target, when using `macros:Form` with a navigation `metaPath`**: When `macros:Form metaPath` is `"_Navigation/@...FieldGroup#..."`, the dialog's `bindElement` must use the parent entity path (e.g. `Travel(...)`), **not** the navigation target path (e.g. `Travel(...)/_Navigation`). The building block navigates from the parent binding context through `_Navigation` automatically. If you `bindElement` to `Travel(...)/_Navigation` AND use `metaPath="_Navigation/..."`, the actual OData path becomes `/_Navigation/_Navigation/...` which does not exist. Correct usage: `oDialog.bindElement({ path: oBindingContext.getPath() })` where `oBindingContext` is the row's parent entity context.

**CRITICAL PITFALL 13 — `bindElement` — do NOT pass an OData context object inside `parameters`**: In OData V4, both `oDialog.bindElement(absolutePathString)` and `oDialog.bindElement({ path: absolutePathString })` work correctly. The **object form** `{ path: "..." }` is preferred for OData V4 because it allows adding binding parameters when needed (e.g. `{ path: "...", parameters: { $$ownRequest: true } }`). The working Step 5 code uses this object form. The critical warning is: do NOT pass an OData context object as a value inside `parameters`, i.e. do NOT write `oDialog.bindElement({ path: "_Navigation", parameters: { context: oBindingContext } })`. OData V4 context objects contain circular references (bidirectional parent↔child context chains) that cause the framework to throw `"Converting circular structure to JSON"` when it serializes the binding parameters. Use only the absolute path string derived from `oContext.getPath()` — never pass the context object itself.

**CRITICAL PITFALL 14 — Must `return oDialog` from the `.then()` callback inside `Fragment.load().then()`**: When storing a Fragment.load Promise as `this._pRelatedEntityDialog`, the `.then()` callback where `oView.addDependent(oDialog)` is called MUST end with `return oDialog`. If omitted, the Promise resolves to `undefined` (the implicit return value). All subsequent calls like `this._pRelatedEntityDialog.then(function(oDialog) { oDialog.open(); })` will then receive `undefined` as `oDialog` — `oDialog.open()` silently fails or throws `TypeError: Cannot read properties of undefined`. This is the single most common silent failure in the Fragment.load Promise pattern. Always write: `.then(function(oDialog) { oView.addDependent(oDialog); return oDialog; })`. As a related convention: prefix all Promise-stored dialog references with `_p` (e.g. `_pRelatedEntityDialog`, `_pAgencyPopup`) to visually distinguish them from direct object references — this makes it immediately clear that `.then()` must be used to access the dialog.

**CRITICAL PITFALL 15 — `sap.fe.macros.Field` renders in display-only mode in a `Fragment.load()` dialog that is NOT bound to an OData context**: When a dialog loaded via `Fragment.load()` binds its fields to a JSON model (not an OData model), `sap.fe.macros.Field` building blocks render in display-only mode regardless of `editMode="Editable"`. The building block relies on the Fiori Elements OData model context to resolve and apply edit mode at runtime — without an OData binding context on the dialog or a parent view context, the field stays read-only and user input is not possible. **Fix**: For data-entry dialogs where field values are stored in a JSON model (not read from OData), replace `macros:Field` with standard `sap.m` controls: use `sap.m.Input` for string/text fields (TravelID, AgencyID, etc.) and `sap.m.DatePicker` for date fields. `sap.m.DatePicker` with `valueFormat="yyyy-MM-dd"` and `displayFormat="mediumDate"` provides locale-aware date formatting and a calendar dropdown picker out of the box — no OData context required. Note: `macros:Field` CAN work in dialogs that are properly `bindElement()`-bound to an OData entity path (as in the read-only popup pattern above) when the field is being read from OData, but NOT when the field value is bound only to a JSON model.

**CRITICAL PITFALL 16 — The correct manifest.json location for Object Page header toolbar custom actions is `content.header.actions` inside `options.settings`, NOT `controlConfiguration.headerActions`**: To add a custom button to the Object Page header toolbar, add it under `options.settings.content.header.actions` in the Object Page routing target configuration. Each action is a key under `actions` with `press`, `text`, `enabled`, and `visible` properties. The `press` value uses the `.extension.<namespace>.<ControllerName>.<methodName>` format (same as other FE-managed view handlers). Using `controlConfiguration.headerActions`, `controlConfiguration.content.header.actions`, or any other path will silently fail — no button appears in the header, no error is thrown. Correct structure:
```JSON
"TravelObjectPage": {
  "type": "Component",
  "id": "TravelObjectPage",
  "name": "sap.fe.templates.ObjectPage",
  "options": {
    "settings": {
      "entitySet": "Travel",
      "content": {
        "header": {
          "actions": {
            "customMyAction": {
              "press": ".extension.my.app.ext.controller.ObjectPageExt.onMyAction",
              "text": "{i18n>myActionLabel}",
              "enabled": true,
              "visible": true
            }
          }
        }
      }
    }
  }
}
```

---

**STEP 1**: Register the custom column in manifest.json

**DESCRIPTION**: Add the column under `controlConfiguration["@com.sap.vocabularies.UI.v1.LineItem"]["columns"]` in the List Report target settings. Key rules: use `"header"` (not `"label"`), do NOT add `"type": "Slot"`, do add `"properties"` with the field(s) used in the template. Replace `my.app`, `LinkedField`, and anchor with your actual values.

**LANGUAGE**: JSON

**CODE**:
```JSON
"controlConfiguration": {
  "@com.sap.vocabularies.UI.v1.LineItem": {
    "columns": {
      "customLinkedFieldColumn": {
        "header": "{i18n>linkedFieldColumnLabel}",
        "template": "my.app.ext.CustomLinkColumn",
        "width": "7rem",
        "availability": "Default",
        "position": {
          "placement": "After",
          "anchor": "DataField::LinkedField"
        },
        "properties": ["LinkedField"]
      }
    }
  }
}
```

**STEP 2**: Register the controller extension in manifest.json

**LANGUAGE**: JSON

**CODE**:
```JSON
"extends": {
  "extensions": {
    "sap.ui.controllerExtensions": {
      "sap.fe.templates.ListReport.ListReportController": {
        "controllerName": "my.app.ext.controller.ListReportExt"
      }
    }
  }
}
```

**STEP 3**: Create the column template fragment

**DESCRIPTION**: Add a stable `id` to the Link control — required when `flexEnabled: true` (see Pitfall 3). If your app has `flexEnabled: false`, omit the `id` to avoid duplicate ID errors across rows. The press handler uses the full `.extension.XXX` path because this fragment is rendered by the FE-managed List Report view. Replace `my.app`, `ListReportExt`, `LinkedField`, and `onLinkPress` with your actual values.

**FILE**: webapp/ext/CustomLinkColumn.fragment.xml

**LANGUAGE**: XML

**CODE**:
```XML
<?xml version="1.0" encoding="UTF-8" ?>
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core">
    <!-- id required when flexEnabled: true (Pitfall 3); omit only if flexEnabled: false -->
    <Link
        id="linkedFieldLink"
        text="{LinkedField}"
        press=".extension.my.app.ext.controller.ListReportExt.onLinkPress"
        wrapping="false" />
</core:FragmentDefinition>
```

**STEP 4**: Create the popup dialog fragment

**DESCRIPTION**: Use `sap.ui.layout.form.SimpleForm` — NOT `macros:Form` (see Pitfall 1). The Close button uses `.onPopupClose` direct dot-prefix — NOT `.extension.XXX.onPopupClose` (see Pitfall 2). IDs on controls inside the dialog are fine (it's only column template fragment controls that must not have static IDs). Add as many Label/Text pairs as needed for the fields of the related entity.

**FILE**: webapp/ext/RelatedEntityPopup.fragment.xml

**LANGUAGE**: XML

**CODE**:
```XML
<?xml version="1.0" encoding="UTF-8" ?>
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
    xmlns:form="sap.ui.layout.form">
    <Dialog
        id="relatedEntityDialog"
        title="{i18n>relatedEntityPopupTitle}"
        contentWidth="40rem"
        resizable="true"
        draggable="true">
        <content>
            <form:SimpleForm
                id="relatedEntityForm"
                editable="false"
                layout="ResponsiveGridLayout"
                labelSpanXL="4"
                labelSpanL="4"
                labelSpanM="4"
                labelSpanS="12"
                columnsXL="1"
                columnsL="1"
                columnsM="1">
                <form:content>
                    <!-- Add one Label + Text pair per field of the related entity -->
                    <Label id="labelField1" text="{i18n>field1Label}" />
                    <Text id="textField1" text="{Field1}" />
                    <Label id="labelField2" text="{i18n>field2Label}" />
                    <Text id="textField2" text="{Field2}" />
                    <!-- ... repeat for additional fields ... -->
                </form:content>
            </form:SimpleForm>
        </content>
        <buttons>
            <!-- MUST use direct .onPopupClose — NOT .extension.XXX.onPopupClose -->
            <Button
                id="relatedEntityCloseButton"
                text="{i18n>closeButton}"
                press=".onPopupClose"
                type="Emphasized" />
        </buttons>
    </Dialog>
</core:FragmentDefinition>
```

**STEP 5**: Create the controller extension

**DESCRIPTION**: Key rules: (1) Use `this.base.getView()` — not `this.getView()` — see Pitfall 6. (2) Prefix fragment id with `oView.getId() + "--relatedEntityPopup"` to avoid ID clashes across view instances. (3) `bindElement` with `oContext.getPath() + "/_RelatedEntity"` navigates OData V4 to fetch the associated entity via the navigation property — replace `_RelatedEntity` with your actual navigation property name. (4) `onPopupClose` is a plain method resolved via `.onPopupClose` in the fragment.

**FILE**: webapp/ext/controller/ListReportExt.controller.js

**LANGUAGE**: JavaScript

**CODE**:
```JavaScript
sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Fragment"
], function (ControllerExtension, Fragment) {
    "use strict";

    return ControllerExtension.extend(
        // Replace "my.app.ext.controller.ListReportExt" with your actual controller extension name
        "my.app.ext.controller.ListReportExt",
        {
            override: {
                onInit: function () {}
            },

            // Called via press=".extension.my.app.ext.controller.ListReportExt.onLinkPress"
            // in the CustomLinkColumn.fragment.xml column template.
            // The .extension.XXX prefix is required here — the fragment is rendered by the FE-managed view.
            onLinkPress: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext();
                // IMPORTANT: use this.base.getView() in a ControllerExtension, NOT this.getView()
                var oView = this.base.getView();

                if (!this._pRelatedEntityDialog) {
                    this._pRelatedEntityDialog = Fragment.load({
                        // Prefix id to ensure uniqueness — avoids ID conflicts if view is reused
                        id: oView.getId() + "--relatedEntityPopup",
                        // Replace "my.app.ext.RelatedEntityPopup" with your actual fragment module name
                        name: "my.app.ext.RelatedEntityPopup",
                        // Pass 'this' so fragment press handlers resolve directly against this extension
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }

                this._pRelatedEntityDialog.then(function (oDialog) {
                    // Navigate OData V4 to the associated entity via the navigation property.
                    // Replace "/_RelatedEntity" with your actual navigation property name (e.g. "/_Agency")
                    oDialog.bindElement({
                        path: oContext.getPath() + "/_RelatedEntity"
                    });
                    oDialog.open();
                });
            },

            // Called via press=".onPopupClose" in RelatedEntityPopup.fragment.xml.
            // MUST use direct dot-prefix here — DO NOT use .extension.XXX.onPopupClose
            // in the fragment. That syntax silently fails for Fragment.load dialogs.
            onPopupClose: function () {
                if (this._pRelatedEntityDialog) {
                    this._pRelatedEntityDialog.then(function (oDialog) {
                        oDialog.close();
                    });
                }
            }
        }
    );
});
```

**STEP 6**: Add i18n keys

**FILE**: webapp/i18n/i18n.properties

**LANGUAGE**: properties

**CODE**:
```properties
#XTIT: Column header for the custom link column
linkedFieldColumnLabel=Linked Field

#XTIT: Title of the related entity popup dialog
relatedEntityPopupTitle=Related Entity Details

#XBUT: Close button label
closeButton=Close

#XTIT: Field labels in the related entity popup
field1Label=Field 1
field2Label=Field 2
```

**STEP 7**: Create mock data for the navigation target entity set (mock server only)

**DESCRIPTION**: Required when running with mock server. Check `metadata.xml` `EntityContainer` for the correct entity set name for your navigation target entity (it is the `EntitySet` whose `EntityType` matches the target of the navigation property). Create a JSON file with that exact name under `webapp/localService/mainService/data/`. Include key field values that match the keys referenced in your parent entity mock data. Do NOT include stream/media properties (type `Edm.Stream`) — they cause mock server errors.

**FILE**: webapp/localService/mainService/data/RelatedEntitySet.json

**LANGUAGE**: JSON

**CODE**:
```JSON
[
  {
    "KeyField": "001",
    "Field1": "Value 1A",
    "Field2": "Value 2A"
  },
  {
    "KeyField": "002",
    "Field1": "Value 1B",
    "Field2": "Value 2B"
  }
]
```

--------------------------------

**TITLE**: ⚠️ NOT WORKING — Custom Column Popup with macros:Form + macros:FormElement in Fragment.load() Dialog (Template-Time Building Blocks — Cannot Be Used at Runtime)

**INTRODUCTION**: ⚠️ THIS PATTERN DOES NOT WORK and is documented here only for reference and error recognition. `sap.fe.macros.Form` and `sap.fe.macros.FormElement` are **template-time building blocks** that cannot be used in dialogs loaded via `Fragment.load()` at runtime — regardless of how they are configured. Actual implementation testing confirmed these building blocks fail with `TypeError: Cannot read properties of undefined (reading 'getModel')` at `FormElement.ts:118` when loaded dynamically. **Do not use this pattern. Use the SimpleForm pattern above (Pitfall 1).**

The steps below are kept as documentation of what fails and why, so you can recognize these patterns if you encounter them. The pitfalls 9–12 below describe additional configuration requirements that would need to be satisfied IF the building blocks worked at runtime — but they do not, so the SimpleForm approach is always correct.

**TAGS**: custom column, popup, dialog, Form building block, macros:Form, macros:FormElement, sap.fe.macros.Form, sap.fe.macros.FormElement, OData V4, bindElement, navigation property, annotation, FieldGroup, controller extension, list report, fragment, link, read-only, data visualization, extension

---

**STEP 1**: Add `@UI.FieldGroup` annotation for the navigation target entity in annotation.xml

**DESCRIPTION**: This step is **required** when using `macros:Form`. Without a local `@UI.FieldGroup`, the building block reads `@UI.Facets` from the service metadata and may crash on `ReferenceURLFacet` (Pitfall 9). Add the annotation to the `<Schema>` in your local `annotation.xml` targeting the entity type (not an entity set). Replace `SAP__self.TargetEntityType` with the fully-qualified entity type of the navigation target (check `metadata.xml` for the type name). List all properties you want to display.

**FILE**: webapp/annotations/annotation.xml

**LANGUAGE**: XML

**CODE**:
```XML
<!-- Add inside <Schema> in annotation.xml, alongside other <Annotations> blocks -->
<Annotations Target="SAP__self.TargetEntityType">
    <!--FieldGroup for popup — avoids ReferenceURLFacet error from @UI.Facets auto-generation-->
    <Annotation Term="UI.FieldGroup" Qualifier="PopupDetails">
        <Record>
            <PropertyValue Property="Data">
                <Collection>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Path="Field1" />
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Path="Field2" />
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Path="Field3" />
                    </Record>
                    <!-- Add one DataField record per property to display -->
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

**STEP 2**: Register the custom column in manifest.json

**DESCRIPTION**: Same as the SimpleForm pattern (Step 1 of that section). Use `"header"` not `"label"`, do NOT add `"type": "Slot"`, do add `"properties"` with the linked field. Replace placeholders with your actual values.

**FILE**: webapp/manifest.json (inside List Report target `controlConfiguration`)

**LANGUAGE**: JSON

**CODE**:
```JSON
"controlConfiguration": {
  "@com.sap.vocabularies.UI.v1.LineItem": {
    "columns": {
      "customLinkedFieldColumn": {
        "header": "{i18n>linkedFieldColumnLabel}",
        "template": "my.app.ext.CustomLinkColumn",
        "width": "7rem",
        "availability": "Default",
        "position": {
          "placement": "After",
          "anchor": "DataField::LinkedField"
        },
        "properties": ["LinkedField"]
      }
    }
  }
}
```

**STEP 3**: Create the column template fragment

**DESCRIPTION**: Same as the SimpleForm pattern (Step 3 of that section). Add a stable `id` when `flexEnabled: true` (Pitfall 3). Press handler uses `.extension.XXX` full path (Pitfall 2).

**FILE**: webapp/ext/CustomLinkColumn.fragment.xml

**LANGUAGE**: XML

**CODE**:
```XML
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core">
    <!-- id required when flexEnabled: true (Pitfall 3) -->
    <Link
        id="linkedFieldLink"
        text="{LinkedField}"
        press=".extension.my.app.ext.controller.ListReportExt.onLinkPress"
        wrapping="false" />
</core:FragmentDefinition>
```

**STEP 4**: Create the popup dialog fragment using macros:Form + macros:FormElement

**DESCRIPTION**: Critical rules: (1) `macros:Form metaPath` must be `"_NavigationProperty/@com.sap.vocabularies.UI.v1.FieldGroup#Qualifier"` — no leading slash, full FieldGroup annotation path (Pitfall 10). (2) Each `macros:FormElement metaPath` is the **bare property name only** — no navigation prefix (Pitfall 11). (3) Close button uses direct `.onPopupClose` — NOT `.extension.XXX.onPopupClose` (Pitfall 2).

**FILE**: webapp/ext/RelatedEntityPopup.fragment.xml

**LANGUAGE**: XML

**CODE**:
```XML
<core:FragmentDefinition
    xmlns:core="sap.ui.core"
    xmlns="sap.m"
    xmlns:macros="sap.fe.macros"
>
    <Dialog
        id="relatedEntityDialog"
        title="{i18n>relatedEntityPopupTitle}"
        contentWidth="40rem"
        resizable="true"
        draggable="true"
    >
        <content>
            <!--
                metaPath format: "_NavigationProperty/@com.sap.vocabularies.UI.v1.FieldGroup#Qualifier"
                - NO leading slash (Pitfall 10)
                - Full term name required in attribute value — NOT short alias like @UI.FieldGroup (Pitfall 10)
                - FieldGroup qualifier is REQUIRED to avoid @UI.Facets auto-generation (Pitfall 9)
            -->
            <macros:Form
                id="relatedEntityForm"
                metaPath="_RelatedEntity/@com.sap.vocabularies.UI.v1.FieldGroup#PopupDetails"
            >
                <!--
                    metaPath = bare property name ONLY, relative to navigation target (Pitfall 11)
                    Do NOT use "_RelatedEntity/Field1" — creates double-navigation path /_RelatedEntity/_RelatedEntity/Field1
                -->
                <macros:FormElement
                    id="relatedEntityFormField1"
                    metaPath="Field1"
                />
                <macros:FormElement
                    id="relatedEntityFormField2"
                    metaPath="Field2"
                />
                <macros:FormElement
                    id="relatedEntityFormField3"
                    metaPath="Field3"
                />
                <!-- Add one macros:FormElement per field listed in the FieldGroup annotation -->
            </macros:Form>
        </content>
        <buttons>
            <!-- MUST use direct .onPopupClose — NOT .extension.XXX.onPopupClose (Pitfall 2) -->
            <Button
                id="relatedEntityCloseButton"
                text="{i18n>closeButton}"
                press=".onPopupClose"
                type="Emphasized"
            />
        </buttons>
    </Dialog>
</core:FragmentDefinition>
```

**STEP 5**: Create the controller extension

**DESCRIPTION**: Critical difference from the SimpleForm pattern: `oDialog.bindElement` must use `oContext.getPath()` — the **parent entity path only**, NOT `oContext.getPath() + "/_RelatedEntity"` (Pitfall 12). The `macros:Form` `metaPath` navigates to `_RelatedEntity` from the parent context automatically. All other rules are identical to the SimpleForm pattern: use `this.base.getView()` (Pitfall 6), unique fragment id suffix (Pitfall 8), and `.onPopupClose` without the `.extension.XXX` prefix in the fragment (Pitfall 2).

**FILE**: webapp/ext/controller/ListReportExt.controller.js

**LANGUAGE**: JavaScript

**CODE**:
```JavaScript
sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Fragment"
], function (ControllerExtension, Fragment) {
    "use strict";

    return ControllerExtension.extend(
        "my.app.ext.controller.ListReportExt",
        {
            override: {
                onInit: function () {}
            },

            // Called via press=".extension.my.app.ext.controller.ListReportExt.onLinkPress"
            // in the column template fragment. .extension.XXX prefix required there (Pitfall 2).
            onLinkPress: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext();
                // IMPORTANT: use this.base.getView(), NOT this.getView() (Pitfall 6)
                var oView = this.base.getView();

                if (!this._pRelatedEntityDialog) {
                    this._pRelatedEntityDialog = Fragment.load({
                        // Unique suffix required to avoid ID conflicts (Pitfall 8)
                        id: oView.getId() + "--relatedEntityPopup",
                        name: "my.app.ext.RelatedEntityPopup",
                        // controller: this → fragment press handlers resolve directly against this extension
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }

                this._pRelatedEntityDialog.then(function (oDialog) {
                    // CRITICAL (Pitfall 12): bind to PARENT entity path only.
                    // macros:Form metaPath="_RelatedEntity/..." navigates from here automatically.
                    // Do NOT use oContext.getPath() + "/_RelatedEntity" — creates double navigation.
                    oDialog.bindElement({
                        path: oContext.getPath()
                    });
                    oDialog.open();
                });
            },

            // Called via press=".onPopupClose" in the fragment (direct dot-prefix, NOT .extension.XXX)
            onPopupClose: function () {
                if (this._pRelatedEntityDialog) {
                    this._pRelatedEntityDialog.then(function (oDialog) {
                        oDialog.close();
                    });
                }
            }
        }
    );
});
```

**STEP 6**: Add i18n keys

**FILE**: webapp/i18n/i18n.properties

**LANGUAGE**: properties

**CODE**:
```properties
#XTIT: Column header for the custom link column
linkedFieldColumnLabel=Linked Field

#XTIT: Title of the related entity popup dialog
relatedEntityPopupTitle=Related Entity Details

#XBUT: Close button label
closeButton=Close
```

--------------------------------

**TITLE**: ⚠️ BROKEN IMPLEMENTATION — Custom Column Popup using macros:Form / macros:FormElement (Reference for Error Recognition)

**INTRODUCTION**: ⚠️ THIS SPECIFIC IMPLEMENTATION IS BROKEN and is documented here so you can recognise and avoid these errors. `sap.fe.macros.Form` and `sap.fe.macros.FormElement` CANNOT work inside a `sap.m.Dialog` loaded via `Fragment.load()` at all — they are template-time building blocks that require the FE preprocessing pipeline (Pitfall 1). This implementation also has six additional specific coding errors which would independently cause failures:

1. `this.getView()` used instead of `this.base.getView()` — crashes immediately in a ControllerExtension (Pitfall 6)
2. `Fragment.load` id uses bare `oView.getId()` with no suffix — causes ID conflicts if a second fragment loads in the same view (Pitfall 8)
3. `oDialog.setBindingContext(oBindingContext)` used instead of `oDialog.bindElement()` — `setBindingContext` sets a pre-resolved context but does not navigate to `_Agency`; the form binding is wrong
4. `metaPath="/_Agency"` with a leading slash — invalid path for a navigation property (Pitfall 10)
5. `metaPath="/_Agency/AgencyID"` on FormElement — leading slash AND navigation prefix cause double-navigation `/_Agency/_Agency/AgencyID` (Pitfall 11)
6. Close button uses `.extension.XXX.onCloseAgencyPopup` in the fragment — silently fails for `Fragment.load` dialogs (Pitfall 2)

**TAGS**: custom column, popup, dialog, Form building block, FormElement building block, sap.fe.macros.Form, sap.fe.macros.FormElement, controller extension, list report, extension, fragment, building blocks, data visualization, association, XML fragment, BROKEN, DO NOT USE

**STEP**: Register the custom column in manifest.json

**DESCRIPTION**: ⚠️ DO NOT USE THIS PATTERN. See the SimpleForm pattern above.

**LANGUAGE**: JSON

**CODE**:
```JSON
"controlConfiguration": {
  "@com.sap.vocabularies.UI.v1.LineItem": {
    "columns": {
      "CustomAgencyColumn": {
        "header": "Agency",
        "template": "com.sap.travel.travelmanagementapp.ext.fragment.AgencyLinkColumn",
        "importance": "High",
        "horizontalAlign": "Begin",
        "width": "12rem",
        "availability": "Default",
        "position": {
          "placement": "After",
          "anchor": "DataField::AgencyID"
        }
      }
    }
  }
}
```


**ADDITIONAL RELATED CODE BLOCKS**:

**FILE**: ext/fragment/AgencyLinkColumn.fragment.xml

**LANGUAGE**: XML

**CODE**:
```XML
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core">
    <Link
        text="{AgencyID}"
        press=".extension.com.sap.travel.travelmanagementapp.ext.controller.ListReportExtension.onOpenAgencyPopup"
        wrapping="false" />
</core:FragmentDefinition>
```

**FILE**: ext/controller/ListReportExtension.controller.js

**LANGUAGE**: JavaScript

**CODE**:
```JavaScript
sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], function (ControllerExtension, Fragment, JSONModel) {
    "use strict";

    return ControllerExtension.extend(
        "com.sap.travel.travelmanagementapp.ext.controller.ListReportExtension",
        {
            override: {
                onInit: function () {
                    // Initialization if needed
                }
            },

            onOpenAgencyPopup: function (oEvent) {
                var oSource = oEvent.getSource();
                var oBindingContext = oSource.getBindingContext();
                var oView = this.getView(); // BUG: should be this.base.getView()

                if (!this._pAgencyPopup) {
                    this._pAgencyPopup = Fragment.load({
                        id: oView.getId(),
                        name: "com.sap.travel.travelmanagementapp.ext.fragment.AgencyPopup",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }

                this._pAgencyPopup.then(function (oDialog) {
                    oDialog.setBindingContext(oBindingContext);
                    oDialog.open();
                });
            },

            onCloseAgencyPopup: function () {
                this._pAgencyPopup.then(function (oDialog) {
                    oDialog.close();
                });
            }
        }
    );
});
```

**FILE**: ext/fragment/AgencyPopup.fragment.xml — ⚠️ BROKEN: macros:Form/FormElement are template-time building blocks that cannot be used in Fragment.load() dialogs. They fail at runtime with `TypeError: Cannot read properties of undefined (reading 'getModel')`. Close button also uses .extension.XXX which silently fails for Fragment.load dialogs.

**LANGUAGE**: XML

**CODE**:
```XML
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
    xmlns:macros="sap.fe.macros">
    <Dialog
        title="Agency Details"
        contentWidth="40rem"
        resizable="true"
        draggable="true">
        <content>
            <!-- ⚠️ BROKEN: macros:Form/FormElement do not work in Fragment.load dialogs -->
            <macros:Form
                id="agencyForm"
                metaPath="/_Agency"
                readOnly="true">
                <macros:FormElement
                    id="agencyIdField"
                    metaPath="/_Agency/AgencyID"
                    readOnly="true" />
                <macros:FormElement
                    id="agencyNameField"
                    metaPath="/_Agency/AgencyName"
                    readOnly="true" />
            </macros:Form>
        </content>
        <beginButton>
            <!-- ⚠️ BROKEN: .extension.XXX prefix silently fails for Fragment.load dialogs -->
            <Button
                text="Close"
                press=".extension.com.sap.travel.travelmanagementapp.ext.controller.ListReportExtension.onCloseAgencyPopup" />
        </beginButton>
    </Dialog>
</core:FragmentDefinition>
```

**FILE**: manifest.json (controller extension registration)

**LANGUAGE**: JSON

**CODE**:
```JSON
"extends": {
    "extensions": {
        "sap.ui.controllerExtensions": {
            "sap.fe.templates.ListReport.ListReportController": {
                "controllerName": "com.sap.travel.travelmanagementapp.ext.controller.ListReportExtension"
            }
        }
    }
}
```

--------------------------------

**TITLE**: ⚠️ BROKEN — Custom Popup for Data Entry using macros:Field and JSON Model (Wrong manifest path + fields render display-only)

**INTRODUCTION**: ⚠️ THIS PATTERN HAS TWO CRITICAL BUGS and is documented here for error recognition only. Do not use it. See the verified working pattern below instead. Bug 1: The manifest.json action is registered under `controlConfiguration.headerActions` — this path does not exist and the button never appears. The correct path is `content.header.actions` inside `options.settings` (see Pitfall 16). Bug 2: The fragment uses `sap.fe.macros.Field` bound to a JSON model — these fields render in display-only mode because `macros:Field` requires an OData binding context to activate edit mode (see Pitfall 15). As a result all input fields are read-only and users cannot enter any data.

**TAGS**: custom popup, data entry, Field building block, sap.fe.macros.Field, object page, header toolbar, toolbar button, JSON model, controller extension, fragment, dialog, custom action, extension, building blocks, BROKEN, DO NOT USE

**STEP**: Register the Object Page header action in manifest.json

**DESCRIPTION**: ⚠️ WRONG PATH — `controlConfiguration.headerActions` does not work. See Pitfall 16 and the verified working pattern below for the correct `content.header.actions` path.

**LANGUAGE**: JSON

**CODE**:
```JSON
"controlConfiguration": {
    "headerActions": {
        "MergeTravelsAction": {
            "press": ".extension.com.sap.travel.travelmanagementapp.ext.controller.ObjectPageExtension.onOpenMergeTravelsPopup",
            "text": "Merge Travels",
            "enabled": true,
            "visible": true,
            "position": {
                "placement": "After",
                "anchor": "StandardAction::Edit"
            }
        }
    }
}
```


**ADDITIONAL RELATED CODE BLOCKS**:

**FILE**: ext/controller/ObjectPageExtension.controller.js

**LANGUAGE**: JavaScript

**CODE**:
```JavaScript
sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], function (ControllerExtension, Fragment, JSONModel) {
    "use strict";

    return ControllerExtension.extend(
        "com.sap.travel.travelmanagementapp.ext.controller.ObjectPageExtension",
        {
            override: {
                onInit: function () {
                    // Initialize the JSON model for the merge travels popup
                    // IMPORTANT: use this.base.getView() in a ControllerExtension, NOT this.getView()
                    var oMergeModel = new JSONModel({
                        travel1: {
                            TravelID: "",
                            TravelID_Text: ""
                        },
                        travel2: {
                            TravelID: "",
                            TravelID_Text: ""
                        },
                        newAgency: {
                            AgencyID: "",
                            AgencyID_Text: ""
                        },
                        newStartDate: {
                            BeginDate: null
                        },
                        newEndDate: {
                            EndDate: null
                        }
                    });
                    this.base.getView().setModel(oMergeModel, "mergeModel");
                }
            },

            onOpenMergeTravelsPopup: function () {
                // IMPORTANT: use this.base.getView() in a ControllerExtension, NOT this.getView()
                var oView = this.base.getView();

                // Pre-fill Travel 1 with the TravelID from the current Object Page binding context
                var oContext = oView.getBindingContext();
                if (oContext) {
                    var sTravelID = oContext.getProperty("TravelID");
                    oView.getModel("mergeModel").setProperty("/travel1/TravelID", sTravelID);
                }

                if (!this._pMergePopup) {
                    this._pMergePopup = Fragment.load({
                        // Always add a unique suffix — using bare oView.getId() causes ID conflicts
                        id: oView.getId() + "--mergeTravelsPopup",
                        name: "com.sap.travel.travelmanagementapp.ext.fragment.MergeTravelsPopup",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }

                this._pMergePopup.then(function (oDialog) {
                    oDialog.open();
                });
            },

            onMergeTravels: function () {
                // IMPORTANT: use this.base.getView() in a ControllerExtension, NOT this.getView()
                var oMergeModel = this.base.getView().getModel("mergeModel");
                var oData = oMergeModel.getData();
                // TODO: Call OData action or implement merge logic using oData values
                this.onCloseMergeTravelsPopup();
            },

            onCloseMergeTravelsPopup: function () {
                this._pMergePopup.then(function (oDialog) {
                    oDialog.close();
                });
            }
        }
    );
});
```

**FILE**: ext/fragment/MergeTravelsPopup.fragment.xml

**LANGUAGE**: XML

**CODE**:
```XML
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
    xmlns:macros="sap.fe.macros">
    <Dialog
        title="Merge Travels"
        contentWidth="40rem"
        resizable="true"
        draggable="true">
        <content>
            <VBox class="sapUiSmallMargin">
                <Label text="Travel 1" required="true" />
                <macros:Field
                    id="travel1Field"
                    metaPath="/Travels/TravelID"
                    value="{mergeModel>/travel1/TravelID}"
                    description="{mergeModel>/travel1/TravelID_Text}"
                    editable="true" />
                <Label text="Travel 2" required="true" />
                <macros:Field
                    id="travel2Field"
                    metaPath="/Travels/TravelID"
                    value="{mergeModel>/travel2/TravelID}"
                    description="{mergeModel>/travel2/TravelID_Text}"
                    editable="true" />
                <Label text="New Agency" />
                <macros:Field
                    id="newAgencyField"
                    metaPath="/Travels/AgencyID"
                    value="{mergeModel>/newAgency/AgencyID}"
                    description="{mergeModel>/newAgency/AgencyID_Text}"
                    editable="true" />
                <Label text="New Start Date" />
                <macros:Field
                    id="newStartDateField"
                    metaPath="/Travels/BeginDate"
                    value="{mergeModel>/newStartDate/BeginDate}"
                    editable="true" />
                <Label text="New End Date" />
                <macros:Field
                    id="newEndDateField"
                    metaPath="/Travels/EndDate"
                    value="{mergeModel>/newEndDate/EndDate}"
                    editable="true" />
            </VBox>
        </content>
        <beginButton>
            <!-- MUST use direct .onMergeTravels — NOT .extension.XXX.onMergeTravels -->
            <!-- (Fragment.load dialogs resolve handlers directly against controller:this) -->
            <Button
                text="Merge"
                type="Emphasized"
                press=".onMergeTravels" />
        </beginButton>
        <endButton>
            <!-- MUST use direct .onCloseMergeTravelsPopup — NOT .extension.XXX.onCloseMergeTravelsPopup -->
            <Button
                text="Cancel"
                press=".onCloseMergeTravelsPopup" />
        </endButton>
    </Dialog>
</core:FragmentDefinition>
```

**FILE**: manifest.json (Object Page controller extension registration)

**LANGUAGE**: JSON

**CODE**:
```JSON
"extends": {
    "extensions": {
        "sap.ui.controllerExtensions": {
            "sap.fe.templates.ObjectPage.ObjectPageController": {
                "controllerName": "com.sap.travel.travelmanagementapp.ext.controller.ObjectPageExtension"
            }
        }
    }
}
```

--------------------------------

**TITLE**: Custom Page with Timeline Control Navigation from List Report Toolbar ✅ VERIFIED WORKING PATTERN

**INTRODUCTION**: This guide explains how to add a "Show Timeline" button to the List Report table toolbar that navigates to a custom FPM page. The custom page displays all travel records in a `sap.suite.ui.commons.Timeline` control sorted ascending by `BeginDate`. The custom page uses `sap.fe.macros.Page` as the container, `sap.m.Panel` as a wrapper, and `sap.suite.ui.commons.Timeline` with inline `TimelineItem` binding. This pattern was verified end-to-end including mock server and live OData V4. Follow every critical pitfall — each one causes silent failures or runtime errors.

Replace all placeholder names with your actual values:
- `my.app.namespace` → your app namespace (e.g. `fin.test.rap.lr3`)
- `EntitySet` → your OData entity set name (e.g. `Travel`)
- `ListReportTarget` → your List Report routing target name
- `TimelinePageTarget` → your timeline page routing target name
- `TimelinePageRoute` → your timeline route name (e.g. `TravelTimeline`)

**TAGS**: custom page, timeline, navigation, toolbar button, List Report, sap.fe.macros.Page, Page building block, sap.m.Panel, sap.suite.ui.commons.Timeline, TimelineItem, controller extension, custom route, manifest routing, extension, building blocks, custom navigation, FPM, HashChanger, press handler, module ID

---

**CRITICAL PITFALL A — The manifest `press` handler for toolbar actions resolves a PLAIN `.js` module, NOT a `.controller.js` module**: When a custom toolbar action is declared in `manifest.json` under `controlConfiguration["@com.sap.vocabularies.UI.v1.LineItem"].actions` with `"press": "my.app.namespace.ext.controller.ListReportExt.onShowTimeline"`, the Fiori Elements framework resolves this by loading the AMD module `my/app/namespace/ext/controller/ListReportExt.js` (note: plain `.js`, NOT `ListReportExt.controller.js`). The `ListReportExt.controller.js` file is registered under a different module ID: `my/app/namespace/ext/controller/ListReportExt.controller`. Attempting to use only `ListReportExt.controller.js` causes `ModuleError: failed to load 'my/app/namespace/ext/controller/ListReportExt.js'` and the button click does nothing. **Fix**: Create a SEPARATE file `webapp/ext/controller/ListReportExt.js` (no `.controller.` in the filename) that exports a plain object with the handler function. This file coexists with `ListReportExt.controller.js`.

**CRITICAL PITFALL B — In a plain FPM module handler (`.js`, not `.controller.js`), `this` is the exported object — use `HashChanger` for navigation, NOT the router**: In a plain AMD module (the `.js` file described in Pitfall A), the exported handler function is called with `this` set to the exported object itself — there is no SAPUI5 component or controller context. `UIComponent.getRouterFor(this)` returns `undefined` because `this` is not a ManagedObject. Calling `this.base.getView().getController().getOwnerComponent().getRouter()` crashes with `TypeError: Cannot read properties of undefined`. **Fix**: Use `sap.ui.core.routing.HashChanger.getInstance().setHash("RoutePattern")` to navigate. This directly sets the browser hash (triggering the router's pattern matching) without needing a component or controller reference. Use the route PATTERN (not the route name) as the hash value. For example, if the route has `"pattern": "TravelTimeline:?query:"`, set the hash to `"TravelTimeline"` (omit the `:?query:` optional query suffix).

**CRITICAL PITFALL C — Route pattern must be unique**: The timeline route pattern must not conflict with any existing route pattern. In Fiori Elements apps, the List Report route typically uses `":?query:"` and the Object Page route uses `"EntitySet({key}):?query:"`. Use a distinct string prefix (e.g. `"TravelTimeline:?query:"`) that cannot match those patterns. Do NOT use a pattern like `"Travel({key}):?query:"` — it would conflict with the Object Page route.

**CRITICAL PITFALL D — MCP tools may overwrite `navigation.EntitySet.detail.route` when modifying manifest.json**: Some automated tooling (including MCP-based code generators) may regenerate the manifest routing section and reset `navigation.EntitySet.detail.route` from your custom timeline target back to the Object Page. After any automated manifest modification, verify that the `navigation` section still maps row clicks to `TravelObjectPage` (or whatever your Object Page target is), NOT to the timeline target. The timeline target should only be reachable via the toolbar button.

**CRITICAL PITFALL E — The FPM custom page target must use `sap.fe.core.fpm` component, NOT `sap.fe.templates.ListReport` or a plain View target**: When the timeline page target is registered in manifest.json, it must use `"name": "sap.fe.core.fpm"` as the component name (not a view type/name directly at the target level). The `viewName` goes inside `options.settings`. This is required for `sap.fe.macros.Page` to work as the root element of the view. A plain `"type": "View"` target does NOT initialise the FPM context needed by `macros:Page`.

**CRITICAL PITFALL F — `TimelineItem` controls inside a bound `Timeline` need an explicit `id` attribute when `flexEnabled: true`**: When `sap.ui5.flexEnabled: true` is set in manifest.json, all controls need stable IDs for SAPUI5 Flexibility. Add `id="timelineItemTemplate"` (or similar) to the `suite:TimelineItem` element inside the Timeline's content aggregation binding template.

**CRITICAL PITFALL G — Inside a ControllerExtension, `sap.ui.core.UIComponent.getRouterFor(this.base.getView())` returns `undefined` — use `this.base.getAppComponent().getRouter().navTo()` instead**: When a toolbar action press handler is implemented as a method on a registered `ControllerExtension` (using the `.extension.<namespace>.<ControllerName>.<method>` press format rather than a plain module), the static helper `sap.ui.core.UIComponent.getRouterFor(view)` may return `undefined` because the view's owner component chain is not resolved as expected within the FPM controller extension lifecycle. Calling `.navTo()` on `undefined` throws `TypeError: Cannot read properties of undefined (reading 'navTo')`. **Fix**: Use `this.base.getAppComponent().getRouter().navTo("RouteName")`. `this.base` is the FE base controller; `getAppComponent()` reliably returns the app component from within any ControllerExtension; `getRouter()` then returns the router. Pass the **route name** (e.g. `"TravelTimelinePage"`), NOT the route pattern. This is distinct from Pitfall B (which applies to plain `.js` modules where `this.base` does not exist at all and `HashChanger` must be used instead).

---

**STEP 1**: Add the timeline route and FPM target to manifest.json routing

**DESCRIPTION**: Add a new route with a unique pattern and a new target using `sap.fe.core.fpm`. The target's `options.settings` must include `contextPath` (the OData entity set path) and `viewName` (the fully qualified view module name). The `navigation` section must keep the List Report row-click navigation pointing to the Object Page, NOT to the timeline target.

**FILE**: webapp/manifest.json

**LANGUAGE**: JSON

**CODE**:
```JSON
"routing": {
  "routes": [
    {
      "pattern": ":?query:",
      "name": "EntitySetList",
      "target": "EntitySetList"
    },
    {
      "pattern": "EntitySet({key}):?query:",
      "name": "EntitySetObjectPage",
      "target": "EntitySetObjectPage"
    },
    {
      "pattern": "TravelTimeline:?query:",
      "name": "TravelTimelinePage",
      "target": "TravelTimelinePage"
    }
  ],
  "targets": {
    "EntitySetList": {
      "type": "Component",
      "id": "EntitySetList",
      "name": "sap.fe.templates.ListReport",
      "options": {
        "settings": {
          "entitySet": "EntitySet",
          "navigation": {
            "EntitySet": {
              "detail": {
                "route": "EntitySetObjectPage"
              }
            }
          }
        }
      }
    },
    "EntitySetObjectPage": {
      "type": "Component",
      "id": "EntitySetObjectPage",
      "name": "sap.fe.templates.ObjectPage",
      "options": {
        "settings": {
          "entitySet": "EntitySet",
          "navigation": {}
        }
      }
    },
    "TravelTimelinePage": {
      "type": "Component",
      "id": "TravelTimelinePage",
      "name": "sap.fe.core.fpm",
      "options": {
        "settings": {
          "contextPath": "/EntitySet",
          "viewName": "my.app.namespace.ext.view.TravelTimeline"
        }
      }
    }
  }
}
```

**STEP 2**: Register the toolbar action in manifest.json

**DESCRIPTION**: Add the `showTimeline` action under `controlConfiguration["@com.sap.vocabularies.UI.v1.LineItem"].actions` in the List Report target settings. The `press` value must reference `my.app.namespace.ext.controller.ListReportExt.onShowTimeline` — where `ListReportExt` (without `.controller.`) is the plain module file created in Step 4 (see Pitfall A).

**FILE**: webapp/manifest.json (inside the List Report target `options.settings`)

**LANGUAGE**: JSON

**CODE**:
```JSON
"controlConfiguration": {
  "@com.sap.vocabularies.UI.v1.LineItem": {
    "actions": {
      "showTimeline": {
        "press": "my.app.namespace.ext.controller.ListReportExt.onShowTimeline",
        "text": "{i18n>showTimeline}",
        "enabled": true,
        "visible": true
      }
    }
  }
}
```

**STEP 3**: Add `sap.suite.ui.commons` library dependency to manifest.json

**DESCRIPTION**: The Timeline control comes from `sap.suite.ui.commons`. Add it to `sap.ui5.dependencies.libs` with `"lazy": false` so it is loaded upfront.

**FILE**: webapp/manifest.json

**LANGUAGE**: JSON

**CODE**:
```JSON
"sap.ui5": {
  "dependencies": {
    "libs": {
      "sap.m": {},
      "sap.ui.core": {},
      "sap.fe.templates": {},
      "sap.suite.ui.commons": {
        "lazy": false
      }
    }
  }
}
```

**STEP 4**: Create the plain press-handler module `ListReportExt.js`

**DESCRIPTION**: This is a SEPARATE file from `ListReportExt.controller.js`. It exports a plain object (not a ControllerExtension) with the `onShowTimeline` method. FE resolves `my.app.namespace.ext.controller.ListReportExt.onShowTimeline` by loading `ListReportExt.js` (no `.controller.` in filename — see Pitfall A). Use `HashChanger.getInstance().setHash(...)` for navigation — do NOT use the router (see Pitfall B). The hash value is the route pattern prefix WITHOUT the `:?query:` optional part.

**FILE**: webapp/ext/controller/ListReportExt.js

**LANGUAGE**: JavaScript

**CODE**:
```JavaScript
sap.ui.define(["sap/ui/core/routing/HashChanger"], function (HashChanger) {
    "use strict";

    return {
        // Called via press="my.app.namespace.ext.controller.ListReportExt.onShowTimeline"
        // in manifest.json controlConfiguration actions.
        // 'this' here is the exported object — NOT a controller or component instance (Pitfall B).
        // Use HashChanger for navigation — router is not accessible without a component context.
        onShowTimeline: function (oBindingContext, aSelectedContexts) {
            // Set the hash to the route pattern prefix (omit the :?query: optional suffix)
            // This triggers the router's pattern matching for the "TravelTimeline:?query:" route
            HashChanger.getInstance().setHash("TravelTimeline");
        }
    };
});
```

**STEP 4b (ALTERNATIVE)**: Add the press handler to the existing ControllerExtension instead of a separate plain module

**DESCRIPTION**: If you already have a `ListReportExt.controller.js` ControllerExtension registered in manifest.json, you can add the navigation handler directly to it instead of creating a separate `ListReportExt.js` plain module. In this case the manifest `press` value must use the `.extension.<namespace>.<ControllerName>.<method>` format (not a bare module path). Inside the ControllerExtension, use `this.base.getAppComponent().getRouter().navTo("RouteName")` for navigation — do NOT use `sap.ui.core.UIComponent.getRouterFor(this.base.getView())` which returns `undefined` in this context (see Pitfall G). Pass the route **name** (e.g. `"TravelTimelinePage"`), not the route pattern.

Manifest action entry for this approach:
```JSON
"showTimeline": {
  "press": ".extension.my.app.namespace.ext.controller.ListReportExt.showTimeline",
  "text": "{i18n>showTimeline}",
  "enabled": true
}
```

Method added to the ControllerExtension (outside the `override` block):
```JavaScript
showTimeline: function () {
    // CORRECT: getAppComponent() reliably returns the app component from any ControllerExtension
    // Do NOT use: sap.ui.core.UIComponent.getRouterFor(this.base.getView()) — returns undefined (Pitfall G)
    this.base.getAppComponent().getRouter().navTo("TravelTimelinePage");
}
```

Choose this approach over Step 4 when: (a) you already have a ControllerExtension and want to keep all List Report logic in one file, or (b) you need access to `this.base` (view, model, etc.) inside the handler. Choose Step 4 (plain module + HashChanger) when: you have no existing ControllerExtension, or you want minimal coupling.

**STEP 5**: Create the timeline view

**DESCRIPTION**: The view uses `sap.fe.macros.Page` as the root element (required for FPM context — Pitfall E). The `macros:Page` wraps a `sap.m.Panel` which contains the `sap.suite.ui.commons.Timeline`. The Timeline uses an aggregation binding on `/EntitySet` with `$orderby: 'BeginDate asc'` to fetch records sorted ascending. The `suite:TimelineItem` template has an explicit `id` attribute (required when `flexEnabled: true` — Pitfall F). The `controllerName` is required and must point to a valid controller file.

**FILE**: webapp/ext/view/TravelTimeline.view.xml

**LANGUAGE**: XML

**CODE**:
```XML
<mvc:View
    xmlns:core="sap.ui.core"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:macros="sap.fe.macros"
    xmlns:suite="sap.suite.ui.commons"
    controllerName="my.app.namespace.ext.view.TravelTimeline">
    <macros:Page
        id="TravelTimelineMacrosPage"
        title="{i18n>TravelTimelineTitle}"
        description="{i18n>TravelTimelineDescription}"
        avatarSrc="sap-icon://timeline">
        <Panel
            id="travelTimelinePanel"
            headerText="{i18n>TravelTimelinePanelTitle}">
            <suite:Timeline
                id="travelTimeline"
                sortOldestFirst="true"
                showSearch="false"
                content="{
                    path: '/EntitySet',
                    parameters: {
                        $orderby: 'BeginDate asc'
                    }
                }">
                <suite:TimelineItem
                    id="travelTimelineItem"
                    dateTime="{BeginDate}"
                    title="{= 'Record #' + ${EntitySetID}}"
                    text="{Memo}"
                    userName="{CustomerName}" />
            </suite:Timeline>
        </Panel>
    </macros:Page>
</mvc:View>
```

**STEP 6**: Add i18n keys

**FILE**: webapp/i18n/i18n.properties

**LANGUAGE**: properties

**CODE**:
```properties
#XBUT: Toolbar button label for Show Timeline action
showTimeline=Show Timeline

#XTIT: Title of the Travel Timeline custom page
TravelTimelineTitle=Travel Timeline

#XFLD: Description shown under the page title
TravelTimelineDescription=All Travels sorted by Start Date

#XTIT: Header text of the panel wrapping the timeline
TravelTimelinePanelTitle=Travels Timeline
```

**STEP 7**: Verify navigation still works for row clicks (Object Page)

**DESCRIPTION**: After completing all steps above, verify that clicking a table row in the List Report still navigates to the Object Page (not the timeline). In manifest.json, check that `navigation.EntitySet.detail.route` is set to the Object Page route name (e.g. `EntitySetObjectPage`), NOT to `TravelTimelinePage`. If any automated tooling was used on manifest.json, re-verify this (Pitfall D).

**LANGUAGE**: JSON

**CODE**:
```JSON
"navigation": {
  "EntitySet": {
    "detail": {
      "route": "EntitySetObjectPage"
    }
  }
}
```

--------------------------------

**TITLE**: Object Page Header Toolbar Button → Data Entry Popup with Standard Controls (Input, DatePicker) ✅ VERIFIED WORKING PATTERN

**INTRODUCTION**: This guide explains how to add a custom button to the Object Page header toolbar that opens a data-entry popup dialog. The popup uses standard `sap.m` controls — `sap.m.Input` for text/string fields and `sap.m.DatePicker` for date fields — bound to a local JSON model. This is the correct pattern when field values are stored in a JSON model (not OData). Do NOT use `sap.fe.macros.Field` for this use case — those building blocks render display-only when not backed by an OData binding context (see Pitfall 15). Do NOT register the action under `controlConfiguration.headerActions` — the correct path is `content.header.actions` (see Pitfall 16).

Replace all placeholder names with your actual values:
- `my.app` → your app namespace (e.g. `fin.test.rap.lr3`)
- `ObjectPageExt` → your Object Page controller extension name
- `MyEntityObjectPage` → your Object Page routing target name
- `MyEntity` → your OData entity set name

**TAGS**: custom popup, data entry, object page, header toolbar, toolbar button, JSON model, sap.m.Input, sap.m.DatePicker, DatePicker, date picker, controller extension, fragment, dialog, custom action, extension, standard controls, verified working

---

**STEP 1**: Register the header toolbar action in manifest.json

**DESCRIPTION**: Add the action under `options.settings.content.header.actions` in the Object Page routing target. This is the ONLY correct location — `controlConfiguration.headerActions` silently fails (Pitfall 16). The `press` handler uses the full `.extension.<namespace>.<ControllerName>.<methodName>` format because the Object Page view is FE-managed (Pitfall 2). Replace `my.app`, `ObjectPageExt`, `MyEntityObjectPage`, and `MyEntity` with your actual values.

**FILE**: webapp/manifest.json (inside the Object Page routing target)

**LANGUAGE**: JSON

**CODE**:
```JSON
"MyEntityObjectPage": {
  "type": "Component",
  "id": "MyEntityObjectPage",
  "name": "sap.fe.templates.ObjectPage",
  "options": {
    "settings": {
      "entitySet": "MyEntity",
      "content": {
        "header": {
          "actions": {
            "customDataEntryAction": {
              "press": ".extension.my.app.ext.controller.ObjectPageExt.onOpenDataEntryPopup",
              "text": "{i18n>dataEntryActionLabel}",
              "enabled": true,
              "visible": true
            }
          }
        }
      }
    }
  }
}
```

**STEP 2**: Register the Object Page controller extension in manifest.json

**LANGUAGE**: JSON

**CODE**:
```JSON
"extends": {
  "extensions": {
    "sap.ui.controllerExtensions": {
      "sap.fe.templates.ObjectPage.ObjectPageController": {
        "controllerName": "my.app.ext.controller.ObjectPageExt"
      }
    }
  }
}
```

**STEP 3**: Create the popup dialog fragment

**DESCRIPTION**: Use `sap.m.Input` for string fields and `sap.m.DatePicker` for date fields. Key rules: (1) `sap.m.DatePicker` requires `valueFormat` matching the OData date format (`yyyy-MM-dd`) and `displayFormat="mediumDate"` for locale-aware user-facing formatting — this also activates the calendar dropdown picker. (2) All button press handlers use direct dot-prefix `.onXxx` — NOT `.extension.XXX.onXxx` — because the fragment is loaded via `Fragment.load()` with `controller: this` (Pitfall 2). (3) All controls in the dialog need stable `id` attributes because `flexEnabled: true` (Pitfall 3). (4) Use `xmlns:form="sap.ui.layout.form"` and `<form:SimpleForm>` with `<form:content>` aggregation for the form layout.

**FILE**: webapp/ext/fragment/DataEntryPopup.fragment.xml

**LANGUAGE**: XML

**CODE**:
```XML
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
    xmlns:form="sap.ui.layout.form">
    <Dialog
        id="dataEntryDialog"
        title="{i18n>dataEntryDialogTitle}"
        contentWidth="32rem"
        resizable="true"
        draggable="true">
        <content>
            <form:SimpleForm
                id="dataEntryForm"
                editable="true"
                layout="ResponsiveGridLayout"
                labelSpanXL="5"
                labelSpanL="5"
                labelSpanM="5"
                labelSpanS="12"
                columnsXL="1"
                columnsL="1"
                columnsM="1">
                <form:content>
                    <!-- String / text fields: use sap.m.Input -->
                    <Label id="field1Label" text="{i18n>field1Label}" labelFor="field1Input" />
                    <Input
                        id="field1Input"
                        value="{entryModel>/Field1}"
                        placeholder="{i18n>field1Label}"
                        editable="true" />

                    <!-- Date fields: use sap.m.DatePicker -->
                    <!-- valueFormat must match the OData Edm.Date wire format (yyyy-MM-dd) -->
                    <!-- displayFormat="mediumDate" gives locale-aware display + calendar dropdown -->
                    <Label id="startDateLabel" text="{i18n>startDateLabel}" labelFor="startDatePicker" />
                    <DatePicker
                        id="startDatePicker"
                        value="{entryModel>/StartDate}"
                        valueFormat="yyyy-MM-dd"
                        displayFormat="mediumDate"
                        editable="true" />

                    <Label id="endDateLabel" text="{i18n>endDateLabel}" labelFor="endDatePicker" />
                    <DatePicker
                        id="endDatePicker"
                        value="{entryModel>/EndDate}"
                        valueFormat="yyyy-MM-dd"
                        displayFormat="mediumDate"
                        editable="true" />
                </form:content>
            </form:SimpleForm>
        </content>
        <beginButton>
            <!-- MUST use direct .onConfirm — NOT .extension.XXX.onConfirm (Pitfall 2) -->
            <Button
                id="dataEntryConfirmBtn"
                text="{i18n>confirmButton}"
                type="Emphasized"
                press=".onConfirmDataEntry" />
        </beginButton>
        <endButton>
            <!-- MUST use direct .onCloseDataEntryPopup — NOT .extension.XXX.onCloseDataEntryPopup (Pitfall 2) -->
            <Button
                id="dataEntryCancelBtn"
                text="{i18n>cancelButton}"
                press=".onCloseDataEntryPopup" />
        </endButton>
    </Dialog>
</core:FragmentDefinition>
```

**STEP 4**: Create the controller extension

**DESCRIPTION**: Key rules: (1) Use `this.base.getView()` — NOT `this.getView()` — in a ControllerExtension (Pitfall 6). (2) Initialise the JSON model (`entryModel`) in `onInit` using `this.base.getView().setModel()`. (3) Use `Fragment.load()` with a unique id suffix to avoid control ID conflicts (Pitfall 8). (4) Always `return oDialog` from the `.then()` callback (Pitfall 14). (5) Guard `onCloseDataEntryPopup` with `if (this._pDataEntryPopup)` to avoid errors if called before the fragment is ever loaded. (6) Pre-populate fields from the current Object Page context inside `onOpenDataEntryPopup` using `oView.getBindingContext().getProperty("FieldName")`.

**FILE**: webapp/ext/controller/ObjectPageExt.controller.js

**LANGUAGE**: JavaScript

**CODE**:
```JavaScript
sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], function (ControllerExtension, Fragment, JSONModel) {
    "use strict";

    return ControllerExtension.extend(
        // Replace with your actual controller extension name
        "my.app.ext.controller.ObjectPageExt",
        {
            override: {
                onInit: function () {
                    // IMPORTANT: use this.base.getView() — NOT this.getView() — in a ControllerExtension
                    var oView = this.base.getView();

                    // Initialise the JSON model for the data-entry popup
                    oView.setModel(
                        new JSONModel({
                            Field1: "",
                            StartDate: null,   // null = no date pre-selected
                            EndDate: null
                        }),
                        "entryModel"
                    );
                }
            },

            // Called via press=".extension.my.app.ext.controller.ObjectPageExt.onOpenDataEntryPopup"
            // in the Object Page (FE-managed view) — full .extension.XXX path required (Pitfall 2)
            onOpenDataEntryPopup: function () {
                // IMPORTANT: use this.base.getView() — NOT this.getView() (Pitfall 6)
                var oView = this.base.getView();

                // Optional: pre-populate a field from the current Object Page context
                var oContext = oView.getBindingContext();
                if (oContext) {
                    oView.getModel("entryModel").setProperty("/Field1", oContext.getProperty("Field1"));
                }

                if (!this._pDataEntryPopup) {
                    this._pDataEntryPopup = Fragment.load({
                        // Always add a unique suffix to avoid control ID conflicts (Pitfall 8)
                        id: oView.getId() + "--dataEntryPopup",
                        // Replace with your actual fragment module path
                        name: "my.app.ext.fragment.DataEntryPopup",
                        // controller: this → press handlers in the fragment resolve directly against this instance
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog; // MUST return oDialog — omitting this causes oDialog.open() to fail (Pitfall 14)
                    });
                }

                this._pDataEntryPopup.then(function (oDialog) {
                    oDialog.open();
                });
            },

            // Called via press=".onConfirmDataEntry" in the fragment
            // Direct dot-prefix is correct here — fragment is loaded with controller: this (Pitfall 2)
            onConfirmDataEntry: function () {
                var oEntryModel = this.base.getView().getModel("entryModel");
                var oData = oEntryModel.getData();
                // TODO: use oData.Field1, oData.StartDate, oData.EndDate
                // e.g. call an OData action or update a property
                this.onCloseDataEntryPopup();
            },

            // Called via press=".onCloseDataEntryPopup" in the fragment (Pitfall 2)
            onCloseDataEntryPopup: function () {
                if (this._pDataEntryPopup) {
                    this._pDataEntryPopup.then(function (oDialog) {
                        oDialog.close();
                    });
                }
            }
        }
    );
});
```

**STEP 5**: Add i18n keys

**FILE**: webapp/i18n/i18n.properties

**LANGUAGE**: properties

**CODE**:
```properties
#XBUT: Header toolbar button label
dataEntryActionLabel=Open Data Entry

#XTIT: Title of the data entry popup dialog
dataEntryDialogTitle=Data Entry

#XTIT: Field labels
field1Label=Field 1
startDateLabel=Start Date
endDateLabel=End Date

#XBUT: Button labels
confirmButton=Confirm
cancelButton=Cancel
```

--------------------------------
