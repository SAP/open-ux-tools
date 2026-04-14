# Configure Text and TextArrangement

## Skill ID
`configure-text-textarrangement`

## Goal
Configure how ID and description fields are displayed together in SAP Fiori Elements applications using @Common.Text and @UI.TextArrangement annotations.

## Context
Use this skill when you need to display both an ID (e.g., code, key) and its description in dropdowns, tables, or forms. This enhances user experience by showing meaningful text alongside technical IDs.

## Prerequisites
- Existing SAP Fiori Elements application (OData V4)
- CAP-based backend service with entity model
- Entities with ID fields and corresponding description/text fields
- Understanding of CDS annotations

## Steps

### 1. Gather Requirements

Ask the user to clarify:
- Which entity and field needs text configuration
- Which field contains the descriptive text
- Preferred display format (Description first, ID first, text only, or separate columns)

### 2. Define the Text Annotation

Link the ID field to its descriptive text field using `@Common.Text` in your data model.

**File:** `db/schema.cds`

```cds
entity SalesOrder {
  key ID          : UUID;
  OrderID         : String;
  ProductID       : String;
  Status          : String @Common.Text: StatusText;
  StatusText      : String;
}
```

The `@Common.Text` annotation creates a relationship between the ID field and its readable description.

### 3. Configure TextArrangement

Add the `@UI.TextArrangement` annotation to control how the ID and text are displayed together.

**File:** `app/app-name/annotations.cds` or `srv/service-name.cds`

**Option A: Direct TextArrangement annotation (standard)**
```cds
using MyService from '../srv/service';

// Show Description (ID) - Most Common
annotate MyService.SalesOrder with {
  ProductID @UI.TextArrangement: #TextFirst;
}

// Show ID (Description)
annotate MyService.SalesOrder with {
  ProductID @UI.TextArrangement: #TextLast;
}

// Show only Description (ID is hidden)
annotate MyService.SalesOrder with {
  Status @UI.TextArrangement: #TextOnly;
}

// Show ID and Description in separate columns
annotate MyService.SalesOrder with {
  ProductID @UI.TextArrangement: #TextSeparate;
}
```

**Option B: TextArrangement applied to Common.Text (alternative syntax)**
```cds
// This syntax applies TextArrangement directly to the Text annotation
annotate MyService.Partner with {
    partnerID @(
        Common.Text : name,
        Common.Text.@UI.TextArrangement : #TextFirst
    )
};
```

Both syntaxes achieve the same result.

### 4. Test the Configuration

Start the application and verify the text display.

```bash
cd project-folder
npm run watch-app-name
```

**Verify:**
- ID and description display according to chosen arrangement
- Dropdowns show the correct format
- Tables display the configured text arrangement
- Form fields show the expected text format

## TextArrangement Options

| Option | Display Format | Example | Best For |
|--------|----------------|---------|----------|
| `#TextFirst` | Description (ID) | "Premium Widget (PROD-001)" | When description is more important (customer names, product names) |
| `#TextLast` | ID (Description) | "PROD-001 (Premium Widget)" | When ID is more important (product codes, account numbers) |
| `#TextOnly` | Description only | "Confirmed" | When ID is purely technical and users don't need to see it |
| `#TextSeparate` | Separate columns | ID: PROD-001<br>Name: Premium Widget | When both values need equal visibility in tables |

## Complete Example

### Data Model
**File:** `db/schema.cds`

```cds
namespace my.app;

entity SalesOrder {
  key ID          : UUID;
  OrderID         : String;
  CustomerID      : String;
  ProductID       : String @Common.Text: ProductName;
  ProductName     : String;
  Status          : String @Common.Text: StatusText;
  StatusText      : String;
}
```

### Service Definition
**File:** `srv/service.cds`

```cds
using { my.app as db } from '../db/schema';

service OrderService {
  entity SalesOrder as projection on db.SalesOrder;
}
```

### Annotations
**File:** `app/app-name/annotations.cds`

```cds
using OrderService from '../srv/service';

// Show Product Name first, then ID in parentheses
annotate OrderService.SalesOrder with {
  ProductID @UI.TextArrangement: #TextFirst;
  // Result: "Premium Widget (PROD-001)"
}

// Show Product ID first, then Name in parentheses
annotate OrderService.SalesOrder with {
  ProductID @UI.TextArrangement: #TextLast;
  // Result: "PROD-001 (Premium Widget)"
}

// Show only Status text, hide the code
annotate OrderService.SalesOrder with {
  Status @UI.TextArrangement: #TextOnly;
  // Result: "Confirmed" (instead of "C (Confirmed)")
}
```

## Common Patterns

### Customer/Partner Fields
```cds
CustomerID @Common.Text: CustomerName
           @UI.TextArrangement: #TextFirst;
// Shows: "Jane Smith (C12345)"
```

### Product/Material Fields
```cds
ProductID @Common.Text: ProductDescription
          @UI.TextArrangement: #TextLast;
// Shows: "PROD-001 (Premium Widget)"
```

### Status/Code Fields
```cds
StatusCode @Common.Text: StatusDescription
           @UI.TextArrangement: #TextOnly;
// Shows: "Active" (hides the code)
```

### Category Fields
```cds
CategoryID @Common.Text: CategoryName
           @UI.TextArrangement: #TextSeparate;
// Shows ID and Name in separate table columns
```

## Common Issues

**Both ID and description show the same value:**
- Check that `@Common.Text` points to the correct description field
- Verify the text field name matches exactly in your data model

**Only ID shows, no description:**
- Ensure the description field is populated in your data (CSV files)
- Verify the text field is included in the service projection
- Check that the field path in `@Common.Text` is correct

**TextArrangement not working:**
- Verify that both `@Common.Text` and `@UI.TextArrangement` are on the same field
- Ensure you're testing with data that has both ID and description populated
- Clear browser cache and reload the application

**Different format appears than expected:**
- Double-check the TextArrangement enum value (#TextFirst, #TextLast, etc.)
- Verify no conflicting annotations exist in other files
- Check if manifest.json has any overriding configurations

## Example Use Cases

- Display customer names with IDs in sales orders
- Show product descriptions alongside product codes in inventory
- Present status descriptions instead of cryptic status codes
- Display partner names with partner IDs in business documents
- Show material descriptions with material numbers in manufacturing

## Notes

- Always define `@Common.Text` before using `@UI.TextArrangement`
- TextArrangement can be applied at the entity level or in annotations
- Both syntaxes (Option A and B) are valid - choose based on team preference
- For consistency, use the same TextArrangement pattern across similar fields
- Test with real data to ensure both ID and text fields are properly populated
- Consider user workflows when choosing between TextFirst and TextLast
- Use TextOnly for truly technical fields that users don't need to see
- TextSeparate is useful in tables but may not work well in dropdowns