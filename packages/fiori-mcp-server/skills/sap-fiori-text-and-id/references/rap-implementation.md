# ABAP RAP Implementation Guide — Text Arrangement

This document provides detailed implementation steps for configuring text arrangement in **ABAP RAP** projects using CDS annotations and metadata extensions.

---

## Overview

ABAP RAP uses **uppercase with underscores** enum values (`#TEXT_FIRST`, `#TEXT_ONLY`) and generates metadata with the `SAP__common` namespace alias. The default text arrangement for RAP is `#TextFirst` (description first).

---

## Step-by-Step Implementation

### Step 1 — Add Annotations in CDS View or Metadata Extension

Open the consumption CDS view (or create a metadata extension) and add the `@UI.textArrangement` annotation.

**Option A: Direct annotation in CDS view**

```abap
define view entity ZC_SalesOrder
{
  @UI.textArrangement: #TEXT_FIRST  // or #TEXT_LAST, #TEXT_ONLY, #TEXT_SEPARATE
  @ObjectModel.text.element: [ 'CustomerName' ]
  key CustomerID : abap.char(10),
  CustomerName : abap.char(80)
}
```

**Option B: Metadata extension (recommended for separation of concerns)**

```abap
@Metadata.layer: #CORE
annotate view ZC_SalesOrder with
{
  @UI.textArrangement: #TEXT_FIRST
  CustomerID;
}
```

**Example — Customer field with TextFirst:**
```abap
@Metadata.layer: #CORE
annotate view ZC_BOOKING with
{
  @UI.textArrangement: #TEXT_FIRST
  @Consumption.valueHelpDefinition: [{
    entity: { name: 'ZI_Customer', element: 'CustomerID' }
  }]
  CustomerID;
}
```

**Example — Status field with TextOnly:**
```abap
@Metadata.layer: #CORE
annotate view ZC_TRAVEL with
{
  @UI.textArrangement: #TEXT_ONLY
  TravelStatusCode;
}
```

---

### Step 2 — Define ObjectModel.text.element Association

Ensure the `@ObjectModel.text.element` annotation points to the text property. This generates the `Common.Text` annotation in OData metadata.

**For direct properties:**
```abap
define view entity ZI_Customer
{
  @ObjectModel.text.element: [ 'CustomerName' ]
  key CustomerID : abap.char(10),
  CustomerName : abap.char(80)
}
```

**For associated properties:**
```abap
define view entity ZI_Booking
{
  @ObjectModel.text.element: [ '_Customer.Name' ]
  key CustomerID : sysuuid_x16,
  
  _Customer : association to ZI_Customer on _Customer.ID = $projection.CustomerID
}
```

**Important:** The property specified in `@ObjectModel.text.element` must be:
- Accessible in the projection (directly or via association)
- Not marked as hidden
- Present in the same CDS view or reachable via a published association

---

### Step 3 — Verify Association Is Exposed

If the text property is in a related entity, ensure the association is:
- Defined in the interface view
- Exposed in the consumption view (projection)
- Accessible from the service binding

```abap
// Interface view
define view entity ZI_Travel
{
  key TravelID : sysuuid_x16,
  TravelStatusCode : abap.char(1),
  
  // Association to status entity
  _TravelStatus : association to ZI_TravelStatus
    on _TravelStatus.Code = $projection.TravelStatusCode
}

// Consumption view
define view entity ZC_Travel
  as projection on ZI_Travel
{
  key TravelID,
  
  @ObjectModel.text.element: [ '_TravelStatus.Name' ]
  @UI.textArrangement: #TEXT_ONLY
  TravelStatusCode,
  
  // Expose the association
  _TravelStatus
}

// Status entity with text
define view entity ZI_TravelStatus
{
  key Code : abap.char(1),
  Name : abap.char(80)
}
```

---

### Step 4 — Activate and Verify Metadata

1. **Activate the CDS view** in ABAP Development Tools (ADT):
   - Save the file (Ctrl+S / Cmd+S)
   - Activate (Ctrl+F3 / Cmd+F3)
   - Check for activation errors in the Problems view

2. **Publish the service binding** if not already published:
   - Open the service binding
   - Click "Publish" if the service is unpublished
   - Wait for publishing to complete

3. **Download and verify metadata:**
   - Start the Fiori app preview
   - Navigate to `<service-url>/$metadata`
   - Search for the target property annotations

Expected metadata output:

```xml
<Annotations Target="ZC_TRAVEL_CDS.TravelType/TravelStatusCode">
    <Annotation Term="SAP__common.Text" Path="_TravelStatus/Name"/>
    <Annotation Term="SAP__UI.TextArrangement" 
        EnumMember="SAP__UI.TextArrangementType/TextOnly"/>
</Annotations>
```

**Note:** RAP uses the `SAP__` namespace alias. The fully qualified term is identical to CAP: `com.sap.vocabularies.Common.v1.Text`.

---

## Entity-Level Default (Optional)

Set a **default text arrangement** for an entire CDS view. Property-level annotations override this default.

```abap
@UI.textArrangement: #TEXT_LAST
define view entity ZI_MyEntity
{
  @ObjectModel.text.element: [ 'CategoryName' ]
  key CategoryCode : abap.char(10),  // Inherits #TEXT_LAST
  CategoryName : abap.char(80),
  
  @ObjectModel.text.element: [ '_Status.Name' ]
  @UI.textArrangement: #TEXT_ONLY  // Overrides to #TEXT_ONLY
  StatusCode : abap.char(1),
  
  _Status : association to ZI_Status on _Status.Code = $projection.StatusCode
}
```

---

## Common Patterns

### Pattern 1: Association with TextFirst (RAP Default)

Foreign key field with associated description:

```abap
define view entity ZI_Booking
{
  @ObjectModel.text.element: [ '_Customer.Name' ]
  @UI.textArrangement: #TEXT_FIRST
  key CustomerID : sysuuid_x16,
  
  _Customer : association to ZI_Customer 
    on _Customer.ID = $projection.CustomerID
}
```

### Pattern 2: Status Field with TextOnly

Status codes where ID is meaningless to users:

```abap
define view entity ZI_Order
{
  @ObjectModel.text.element: [ '_Status.Description' ]
  @UI.textArrangement: #TEXT_ONLY
  key status_code : abap.int4,
  
  _Status : association to ZI_OrderStatus 
    on _Status.Code = $projection.status_code
}
```

### Pattern 3: Direct Text Property with TextLast

Property with text in the same entity:

```abap
define view entity ZI_Product
{
  @ObjectModel.text.element: [ 'ProductName' ]
  @UI.textArrangement: #TEXT_LAST
  key ProductID : abap.char(10),
  ProductName : abap.char(80)
}
```

### Pattern 4: Value Help with Consistent Text Arrangement

When a field has a value help, ensure matching text arrangement:

```abap
// Main entity with field using value help
@Metadata.layer: #CORE
annotate view ZC_Order with
{
  @Consumption.valueHelpDefinition: [{
    entity: { name: 'ZI_PaymentMethod', element: 'Code' }
  }]
  @UI.textArrangement: #TEXT_ONLY
  PaymentMethodCode;
}

// Value help entity with matching arrangement
define view entity ZI_PaymentMethod
{
  @ObjectModel.text.element: [ 'Name' ]
  @UI.textArrangement: #TEXT_ONLY  // Must match the field
  key Code : abap.char(1),
  Name : abap.char(80)
}
```

---

## Complete Working Example

Full RAP project with text arrangement:

```abap
// ZI_TRAVEL (Interface View)
@AccessControl.authorizationCheck: #CHECK
define view entity ZI_Travel
{
  key travel_id : sysuuid_x16,
  agency_id : abap.char(6),
  customer_id : abap.char(6),
  status_code : abap.char(1),
  
  // Associations
  _Agency : association to ZI_TravelAgency
    on _Agency.AgencyID = $projection.agency_id,
  _Customer : association to ZI_Customer
    on _Customer.CustomerID = $projection.customer_id,
  _Status : association to ZI_TravelStatus
    on _Status.Code = $projection.status_code
}

// ZC_TRAVEL (Consumption View / Projection)
@Metadata.layer: #CORE
define view entity ZC_Travel
  as projection on ZI_Travel
{
  key travel_id,
  
  @ObjectModel.text.element: [ '_Agency.Name' ]
  @UI.textArrangement: #TEXT_FIRST
  agency_id,
  
  @ObjectModel.text.element: [ '_Customer.Name' ]
  @UI.textArrangement: #TEXT_FIRST
  customer_id,
  
  @ObjectModel.text.element: [ '_Status.Name' ]
  @UI.textArrangement: #TEXT_ONLY
  status_code,
  
  // Expose associations
  _Agency,
  _Customer,
  _Status
}

// ZI_TRAVELAGENCY (Agency master data)
define view entity ZI_TravelAgency
{
  @ObjectModel.text.element: [ 'Name' ]
  key AgencyID : abap.char(6),
  Name : abap.char(80)
}

// ZI_CUSTOMER (Customer master data)
define view entity ZI_Customer
{
  @ObjectModel.text.element: [ 'Name' ]
  key CustomerID : abap.char(6),
  Name : abap.char(80)
}

// ZI_TRAVELSTATUS (Status value help)
define view entity ZI_TravelStatus
{
  @ObjectModel.text.element: [ 'Name' ]
  key Code : abap.char(1),
  Name : abap.char(80)
}
```

---

## Troubleshooting RAP-Specific Issues

**"Annotation not appearing in metadata after activation"**
- Ensure the CDS view is activated without errors
- Check that the service binding is published
- Refresh the Fiori app metadata (browser cache may be stale)
- Verify the consumption view (ZC_*) is used in the service definition, not the interface view (ZI_*)

**"Association path cannot be resolved"**
- Verify the association is defined in the interface view
- Check that the association is exposed in the consumption view (projection)
- Ensure the text property is accessible via the association path
- Association name is case-sensitive; match exactly

**"ObjectModel.text.element not generating Common.Text"**
- Verify the text property exists in the target entity
- Check that the path syntax is correct (direct property vs. association path)
- Ensure the property is not hidden at any level
- The text property must be included in the projection

**"Service binding activation fails"**
- Check for CDS view activation errors
- Verify all dependencies (base tables, associations) are activated
- Look for authorization issues (missing DCL)
- Review the activation log in ADT

**"Text not displayed in Fiori app preview"**
- Verify metadata contains the `SAP__common.Text` annotation
- Check browser console for OData errors
- Ensure the text property is not null in test data
- Try with a different browser (clear cache)

**"Enum value syntax error"**
- Use ABAP syntax: `#TEXT_FIRST`, not `#TextFirst`
- Enum values must be uppercase with underscores
- Common typo: `#TEXTFIRST` instead of `#TEXT_FIRST` (missing underscore)

---

## ADT Tips for Text Arrangement

**Quick way to add metadata extension:**
1. Right-click the CDS view → New → Metadata Extension
2. Select the target view
3. ADT generates the boilerplate with `@Metadata.layer` and `annotate` block
4. Add `@UI.textArrangement` to the target property

**Checking generated OData metadata in ADT:**
1. Open the service binding
2. Right-click the entity → Open With → SAP Gateway Client
3. Append `/$metadata` to the URL
4. Search for the target property annotations

**Using ADT code completion:**
- Type `@UI.` and press Ctrl+Space to see available annotations
- Type `#TEXT` and press Ctrl+Space to see text arrangement options
- ADT validates enum values and shows errors inline
