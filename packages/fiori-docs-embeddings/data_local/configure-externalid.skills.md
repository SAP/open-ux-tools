---
name: configure-externalid
description: 'Hide technical GUID keys and display readable business IDs instead when using associations in SAP Fiori Elements applications using the @Common.ExternalID annotation. Use for: showing business keys instead of UUIDs in UI, configuring associations to display readable IDs, improving user experience with meaningful identifiers.'
argument-hint: 'association field name, target entity external ID field name'
---

# Configure External ID for Associations

## Goal
Hide technical GUID keys and display readable business IDs instead when using associations in SAP Fiori Elements applications using the @Common.ExternalID annotation.

## Context
Use this skill when your entities use both technical keys (UUIDs/GUIDs) and business keys (external IDs like customer numbers, product codes), and you want users to see and work with the readable business IDs instead of technical GUIDs in the UI.

## Prerequisites
- Existing SAP Fiori Elements application (OData V4)
- CAP-based backend service with entity model
- Entities using UUIDs as technical keys (e.g., from cuid aspect)
- Business/External ID fields defined in entities (e.g., customerID, partnerID)
- Understanding of associations and CDS annotations

## Steps

### 1. Gather Requirements

Ask the user to clarify:
- Which association field needs External ID configuration
- What is the readable business ID field name in the target entity
- Whether they want text arrangement on the external ID (e.g., show name with ID)

### 2. Verify Entity Structure

Ensure your entities have both technical (GUID) and business (External) IDs defined.

**File:** `db/schema.cds`

```cds
using { managed, cuid } from '@sap/cds/common';

entity Partner : cuid, managed {
  // ID is the technical GUID (from cuid)
  partnerID   : String(10)  @title: 'Partner ID';  // Business/External ID
  name        : String(100) @title: 'Partner Name';
  type        : String(20)  @title: 'Partner Type';
  country     : String(50)  @title: 'Country';
}

entity SalesOrder : cuid, managed {
  orderID       : String(10) @title: 'Order ID';
  description   : String(255) @title: 'Description';
  partner       : Association to Partner;  // Association uses technical GUID
  totalAmount   : Decimal(16,2) @title: 'Total Amount';
  status        : String(1) @title: 'Status';
}
```

Key points:
- Technical key `ID` comes from `cuid` aspect (UUID type)
- Business key `partnerID` is a readable string field
- Association uses the technical GUID internally

### 3. Configure Text on External ID (Optional but Recommended)

If you want the external ID to display with descriptive text, configure it on the target entity.

**File:** `app/app-name/annotations.cds` or `srv/service-name.cds`

```cds
using MyService as service from '../../srv/service';

// Configure Text and TextArrangement on the readable ID in Partner entity
annotate service.Partner with {
    partnerID @(
        Common.Text : name,
        Common.TextArrangement : #TextFirst
    );
};
```

This makes the partnerID display as "ABC Corporation (P-10001)" instead of just "P-10001".

### 4. Apply Common.ExternalID on Association

Configure the association field to use the external ID instead of the GUID.

**File:** `app/app-name/annotations.cds` or `srv/service-name.cds`

```cds
// Apply Common.ExternalID on the association field in SalesOrder entity
annotate service.SalesOrder with {
  partner @(
    Common.ExternalID : partner.partnerID,
    Common.Label: 'Partner'
  );
};
```

**Important:** The `@Common.ExternalID` annotation is applied on the **association field**, pointing to the path of the readable ID through the association.

### 5. Configure ValueList for the Association

Add a ValueList to enable search help functionality with the external ID.

**File:** `app/app-name/annotations.cds` or `srv/service-name.cds`

```cds
annotate service.SalesOrder with {
  partner @(
    Common.ExternalID : partner.partnerID,
    Common.Label: 'Partner',
    Common.ValueList: {
      $Type: 'Common.ValueListType',
      CollectionPath: 'Partner',
      Parameters: [
        {
          $Type: 'Common.ValueListParameterInOut',
          LocalDataProperty: partner_ID,
          ValueListProperty: 'ID'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'partnerID'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'type'
        }
      ]
    },
    Common.ValueListWithFixedValues: false
  );
};
```

**Key Points:**
- `ValueListParameterInOut` uses the technical `ID` for data binding
- `ValueListParameterDisplayOnly` shows external ID and other fields to users
- This ensures the GUID is used internally while showing readable fields in UI

### 6. Hide Technical GUID Fields (Optional)

If the technical GUID fields appear in forms or tables, hide them.

**File:** `app/app-name/annotations.cds` or `srv/service-name.cds`

```cds
annotate service.SalesOrder with {
  partner_ID @UI.Hidden;
};

annotate service.Partner with {
  ID @UI.Hidden;
};
```

### 7. Test the Configuration

Start the application and verify the external ID display.

```bash
cd project-folder
npm run watch-app-name
```

**Verify:**
- Filter fields display the external ID (e.g., "P-10001") instead of GUID
- Value help shows external ID and descriptive fields
- Forms display the external ID with text arrangement if configured
- Tables show the readable external ID
- Technical GUIDs are completely hidden from users
- Data saving works correctly (uses GUID internally)

## Complete Example with XML Format

### Annotations - XML Format

**File:** `app/app-name/webapp/annotations/annotation.xml`

```xml
<!-- Configure text on readable ID in Partner entity -->
<Annotations Target="MyService.Partner/partnerID">
  <Annotation Term="Common.Text" Path="name"/>
  <Annotation Term="Common.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
</Annotations>

<!-- Apply Common.ExternalID on the association field in SalesOrder -->
<Annotations Target="MyService.SalesOrder/partner">
  <Annotation Term="Common.ExternalID" Path="partner/partnerID"/>
  <Annotation Term="Common.Label" String="Partner"/>
  <Annotation Term="Common.ValueList">
    <Record Type="Common.ValueListType">
      <PropertyValue Property="CollectionPath" String="Partner"/>
      <PropertyValue Property="Parameters">
        <Collection>
          <Record Type="Common.ValueListParameterInOut">
            <PropertyValue Property="LocalDataProperty" PropertyPath="partner_ID"/>
            <PropertyValue Property="ValueListProperty" String="ID"/>
          </Record>
          <Record Type="Common.ValueListParameterDisplayOnly">
            <PropertyValue Property="ValueListProperty" String="partnerID"/>
          </Record>
          <Record Type="Common.ValueListParameterDisplayOnly">
            <PropertyValue Property="ValueListProperty" String="name"/>
          </Record>
          <Record Type="Common.ValueListParameterDisplayOnly">
            <PropertyValue Property="ValueListProperty" String="type"/>
          </Record>
        </Collection>
      </PropertyValue>
    </Record>
  </Annotation>
</Annotations>
```

## How External ID Works

1. **Technical Layer (Internal):**
   - The association uses the technical GUID (`partner_ID`) for data storage and relationships
   - Database joins and references use the UUID

2. **UI Layer (User-Facing):**
   - `@Common.ExternalID` tells SAP Fiori Elements to display the external ID (`partnerID`)
   - Users see and search by the readable business ID
   - Technical GUIDs are completely hidden

3. **Data Flow:**
   - User selects "ABC Corporation (P-10001)" from value help
   - UI displays "P-10001" or "ABC Corporation (P-10001)" based on text arrangement
   - Backend stores the corresponding technical GUID
   - On read, GUID is translated back to external ID for display

## Important Rules

- The `@Common.ExternalID` annotation must be applied on the **association field** (e.g., `partner`), pointing to the path of the readable ID (e.g., `partner.partnerID`)
- `@Common.Text` and `@Common.TextArrangement` should be applied on the **readable ID property in the target entity** (e.g., `partnerID` in Partner entity), NOT on the association itself
- Do NOT add Text/TextArrangement annotations on the association field - they belong only on the external ID property
- ValueList must use the technical `ID` for the InOut parameter to ensure correct data binding
- External ID field must be unique or have appropriate constraints

## Common Issues

**GUID still showing in the UI:**
- Verify `@Common.ExternalID` is applied on the association field, not the _ID field
- Check the path points correctly to the external ID through the association (e.g., `partner.partnerID`)
- Add `@UI.Hidden` annotation to the technical ID field if it still appears

**ValueList not working after configuring External ID:**
- Ensure the ValueList uses the technical `ID` for `ValueListProperty` in the InOut parameter
- Verify `LocalDataProperty` points to the foreign key field (e.g., `partner_ID`)
- Check that external ID is included as a DisplayOnly parameter

**External ID not displaying with text:**
- Ensure `@Common.Text` and `@Common.TextArrangement` are configured on the external ID property in the target entity
- Do not apply these annotations on the association field itself
- Verify the text field (e.g., `name`) exists and is populated in data

**Filtering not working by external ID:**
- Check that the external ID field is included in the service projection
- Ensure the external ID field is properly populated in your data
- Verify no typos in the ExternalID path

**Data not saving correctly:**
- Confirm the ValueList InOut parameter uses the technical `ID` field
- Verify the association is properly defined in the data model
- Check that the external ID values in CSV match existing partner records

## Example Use Cases

- Display customer numbers instead of GUIDs in sales orders
- Show product codes instead of technical IDs in order items
- Present employee IDs instead of UUIDs in HR forms
- Display partner numbers instead of GUIDs in business documents
- Show material numbers instead of technical keys in inventory

## Notes

- External ID configuration improves user experience by hiding technical complexity
- Users work with familiar business IDs they already know
- Technical GUIDs remain in use for database integrity and performance
- Always test with real data to ensure external IDs are properly populated
- Consider adding validation to ensure external IDs are unique
- External ID should be immutable or rarely changed for consistency
- Combine with @Common.Text for even better user experience
- This pattern is essential for user-friendly SAP Fiori applications