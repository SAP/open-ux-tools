---
name: sap-fiori-text-and-id
description: >
  Configure how technical codes/IDs and their descriptive text are displayed together in SAP Fiori Elements applications.
  Use when the user asks to: "add text arrangement", "show description with ID", "display customer name and number",
  "configure how codes and descriptions appear", "set text display format", or "change ID/description order".
  Supports both CAP and ABAP RAP backends with OData V4. Use #TextFirst (description first), #TextLast (ID first),
  #TextOnly (description only), or #TextSeparate (separate display) based on requirements.
argument-hint: "Property name and desired arrangement (TextFirst/TextLast/TextOnly/TextSeparate)"
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# SAP Fiori Text Arrangement

## Purpose

Control how **technical codes/IDs** and their **descriptive text** appear together in SAP Fiori Elements applications. Text arrangement determines whether users see "John Doe (99)", "99 (John Doe)", or just "John Doe" for a customer ID field. This feature improves UX by letting you choose the most appropriate display format for each business context.

---

## Example User Prompts

This skill is invoked when users ask questions like:

- "Add text arrangement to my customer field"
- "Show description with ID for the agency field"
- "Display customer name and number together"
- "Configure how codes and descriptions appear in my status field"
- "Set text display format to show description first"
- "Change ID and description order for product category"
- "I want to show only the description, not the ID"
- "Make my payment method field display text before code"

---

## Prerequisites

- **OData version:** V4
- **Backend:** CAP or ABAP RAP (both supported)
- **MCP servers:** Fiori MCP (required), CDS MCP (recommended for CAP), ABAP Development Tools MCP (required for RAP)
- **Hosts:** VS Code, BAS
- **Scope:** draft

If any prerequisite is missing, tell the user how to install or enable it before proceeding. Do not silently degrade.

---

## MANDATORY: Gather Required Inputs First

**STOP and ASK the user for ALL of these inputs if ANY are missing from the prompt:**

1. **Entity name** — The entity containing the property to configure
2. **Property name** — The technical code/ID field (e.g., `CustomerID`, `AgencyID`, `StatusCode`)
3. **Text property path** — The property containing the descriptive text (e.g., `Customer_Name`, `to_Agency.Name`, `StatusText`)
4. **Arrangement type** — Which display format to use:
   - **TextFirst**: `Description (ID)` — e.g., "John Doe (99)" *(RAP default)*
   - **TextLast**: `ID (Description)` — e.g., "99 (John Doe)"
   - **TextOnly**: `Description` only — e.g., "John Doe" *(CAP default)*
   - **TextSeparate**: ID and description shown separately (rare usage)

**DO NOT proceed with implementation until all inputs are confirmed.**

---

## Understanding Text Arrangement Options

| Option | Format | Example | Best For |
|--------|--------|---------|----------|
| `#TextFirst` | Description (ID) | "John Doe (99)" | User-friendly; description is primary |
| `#TextLast` | ID (Description) | "99 (John Doe)" | Technical users; code is primary |
| `#TextOnly` | Description | "John Doe" | UUIDs or meaningless IDs |
| `#TextSeparate` | Separate display | ID shown, text elsewhere | Custom layouts |

**Default behavior:**
- **CAP backends**: `#TextOnly` (description only)
- **ABAP RAP backends**: `#TextFirst` (description first)

If the user doesn't specify an arrangement type, ask which behavior they prefer or use the backend's default.

---

## Quick Reference: Backend Syntax Differences

Text arrangement uses the same OData V4 vocabularies (`Common.Text` and `UI.TextArrangement`) across both backends, but the CDS syntax differs:

| Aspect | CAP | ABAP RAP |
|--------|-----|----------|
| **Enum syntax** | `#TextFirst` (camel case) | `#TEXT_FIRST` (uppercase + underscores) |
| **Annotation term** | `@UI.TextArrangement` | `@UI.textArrangement` |
| **Text property link** | `@Common.Text : path` | `@ObjectModel.text.element: [ 'property' ]` |
| **Default arrangement** | `#TextOnly` | `#TextFirst` |
| **Namespace alias in $metadata** | `Common.Text` | `SAP__common.Text` |

Both compile to the same OData metadata with fully qualified term: `com.sap.vocabularies.UI.v1.TextArrangement`.

---

## Implementation Steps by Backend

### CAP Projects

For detailed CAP implementation with complete examples, patterns, and troubleshooting, see **[references/cap-implementation.md](references/cap-implementation.md)**.

**Quick start:**
1. Add annotations to the entity property in `app/annotations.cds`:
   ```cds
   annotate MyService.EntityName with {
       @Common.Text : TextPropertyPath
       @UI.TextArrangement : #TextFirst
       PropertyName
   };
   ```
2. Verify text property is not hidden (`@UI.Hidden`)
3. Run `cds watch` and check metadata at `http://localhost:4004/<service>/$metadata`

---

### ABAP RAP Projects

For detailed RAP implementation with complete examples, patterns, and troubleshooting, see **[references/rap-implementation.md](references/rap-implementation.md)**.

**Quick start:**
1. Add annotations in metadata extension or CDS view:
   ```abap
   @Metadata.layer: #CORE
   annotate view ZC_EntityName with
   {
     @UI.textArrangement: #TEXT_FIRST
     PropertyName;
   }
   ```
2. Ensure `@ObjectModel.text.element` points to the text property
3. Activate CDS view and verify metadata in service binding

---

## Value Help Integration

When a field has a value help (dropdown or dialog), ensure the text arrangement is **consistent** between the field and its value help source:

```cds
annotate MyService.Order with {
    @Common.Text : _PaymentMethod.Name
    @UI.TextArrangement : #TextOnly
    @Common.ValueList : {
        CollectionPath: 'PaymentMethods',
        Parameters: [{
            $Type : 'Common.ValueListParameterInOut',
            LocalDataProperty: PaymentMethodCode,
            ValueListProperty: 'Code'
        }]
    }
    PaymentMethodCode : String(1);
};

// Ensure the value help entity uses the same arrangement
annotate MyService.PaymentMethod with {
    @Common.Text : Name
    @UI.TextArrangement : #TextOnly  // Matches the field above
    Code : String(1);
};
```

**SAP Fiori tools Page Editor** provides a **"Take Over"** button that synchronizes the text arrangement between a field and its value help automatically.

---

## Verification Checklist

After implementing text arrangement, verify each step:

**Metadata Check:**
- [ ] `$metadata` contains `Common.Text` annotation with correct path to text property
- [ ] `UI.TextArrangement` annotation shows correct enum member (TextFirst/TextLast/TextOnly/TextSeparate)
- [ ] Text property is **not** marked as `@UI.Hidden` (check both property annotations and metadata)

**UI Preview:**
- [ ] Field displays in the expected format (e.g., "Description (ID)" for TextFirst)
- [ ] Display mode (non-editable) shows the arranged text correctly
- [ ] Edit mode shows the appropriate input format
- [ ] Value help (if present) displays entries with matching text arrangement

**Backend-Specific:**
- [ ] **CAP:** `cds watch` runs without errors; metadata regenerated
- [ ] **RAP:** CDS view activated; no ADT warnings; service binding published

**Testing:**
- [ ] Create a new entity record; verify text displays correctly on save
- [ ] Edit an existing record; verify text updates when code changes
- [ ] Filter by the field; verify search includes both code and text (unless TextSeparate)
- [ ] If using value help, select from dropdown/dialog and verify correct text displays

---

## Testing

For starting the app (CAP `cds watch`, RAP `npm start` or `npm run start-mock`) and refreshing local `metadata.xml` after backend changes, consult the **`sap-fiori-app-development`** skill (section *Application Preview Guidelines*). Do not restate those commands here.

Once the app is running:

1. **Navigate to the entity** containing the configured property
2. **Check display mode** — view an existing record and verify the text arrangement format
3. **Enter edit mode** — click Edit and verify the field shows appropriate input format
4. **Test value help** (if applicable) — open dropdown/dialog and verify entries display with matching arrangement
5. **Create a new record** — verify text displays correctly on save
6. **Verify filter behavior** — filter by the property and confirm search works with both code and text

---

## Common Errors and Solutions

**"Text property is hidden but used in Common.Text annotation"**
- **Cause:** The property referenced by `Common.Text` has `@UI.Hidden` or `@UI.Hidden: true`
- **Fix:** Remove the `@UI.Hidden` annotation from the text property. Text properties must be visible for text arrangement to work.

```cds
// ❌ Wrong
annotate MyService.Customer with {
    @UI.Hidden
    Name  // Referenced by Common.Text
};

// ✅ Correct
annotate MyService.Customer with {
    // No @UI.Hidden on Name
    Name
};
```

**"Field displays only ID, not the description"**
- **Cause:** `Common.Text` annotation is missing or the path is incorrect
- **Fix:** Verify the text property path and ensure the association is properly defined. Check metadata for the `Common.Text` annotation.

```cds
// ✅ Correct path for association
@Common.Text : to_Customer.Name  // Path includes association

// ✅ Correct path for direct property
@Common.Text : CustomerName  // Direct property in same entity
```

**"Text arrangement not working in value help"**
- **Cause:** Text arrangement on the field and the value help entity don't match
- **Fix:** Apply the same `UI.TextArrangement` to both the field and the value help entity's key property.

```cds
// Field configuration
annotate MyService.Order with {
    @Common.Text : _Status.Name
    @UI.TextArrangement : #TextOnly  // Must match value help
    StatusCode;
};

// Value help entity configuration
annotate MyService.Status with {
    @Common.Text : Name
    @UI.TextArrangement : #TextOnly  // Must match field
    Code;
};
```

**"Metadata shows SAP__common.Text instead of Common.Text"**
- **Cause:** This is expected for RAP backends; `SAP__` is the namespace alias
- **Fix:** No fix needed. Both `SAP__common.Text` (RAP) and `Common.Text` (CAP) compile to the same fully qualified term: `com.sap.vocabularies.Common.v1.Text`

**"TextArrangement is ignored in FieldGroup column"**
- **Cause:** When a property and its text property are in **the same FieldGroup column**, SAP Fiori Elements ignores `TextArrangement` and defaults to ID-only display
- **Fix:** This is a framework limitation. If you need text arrangement, do not include both the code property and text property in the same FieldGroup. Use only the code property with `Common.Text` annotation.

**"Association path not found in metadata"**
- **Cause:** Association is missing or not included in the projection
- **Fix (CAP):** Ensure the association is defined in the entity and included in the service projection
- **Fix (RAP):** Verify the association is exposed in the CDS view and the text property is accessible via the association path

```cds
// CAP — ensure association is included
entity MyEntity {
    CustomerID : UUID;
    to_Customer : Association to Customer;  // Association defined
};

service MyService {
    entity MyEntity as projection on db.MyEntity;  // Association projected
}
```

**"ABAP CDS annotation not generating OData annotation"**
- **Cause:** ABAP CDS view not activated, or service binding not published
- **Fix:** 
  1. Activate the CDS view in ADT (Ctrl+F3 or Cmd+F3)
  2. Check for activation errors in the Problems view
  3. Publish the service binding
  4. Refresh the Fiori app metadata

**"Copy/paste not working for TextOnly fields"**
- **Cause:** Fields with `TextArrangement = #TextOnly` cannot be pasted in SAP Fiori Elements apps (framework limitation)
- **Fix:** This is expected behavior. If copy/paste is required, use `#TextFirst` or `#TextLast` instead of `#TextOnly`.

---

## References

- [UI5 Demo Kit — Field Help](https://ui5.sap.com/#/topic/a5608eabcc184aee99e1a7d88b28816c)
- [SAP Fiori Elements Feature Explorer](https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html)
- [OData Common Vocabulary](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Common.md)
- [OData UI Vocabulary](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/UI.md)
- [CAP CDS Annotations Reference](https://cap.cloud.sap/docs/guides/providing-services#annotations)
- [ABAP CDS Annotations Reference](https://help.sap.com/docs/ABAP_PLATFORM_NEW/fc4c71aa50014fd1b43721701471913d/630ce9b386b84e80b69d1afaaff52a17.html)
