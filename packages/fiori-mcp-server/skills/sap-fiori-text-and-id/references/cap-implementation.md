# CAP Implementation Guide — Text Arrangement

This document provides detailed implementation steps for configuring text arrangement in **SAP CAP** projects using CDS annotations.

---

## Overview

CAP uses **camel case** enum values (`#TextFirst`, `#TextOnly`) and generates metadata with the `Common` namespace alias. The default text arrangement for CAP is `#TextOnly` (description only).

---

## Step-by-Step Implementation

### Step 1 — Add Common.Text and TextArrangement Annotations

Locate the entity definition in the service layer and add annotations to the target property. This is typically done in the service CDS file (`srv/service.cds`) or a separate annotation file (`app/annotations.cds`).

```cds
using MyService from '../srv/service';

annotate MyService.EntityName with {
    @Common.Text : TextPropertyPath
    @UI.TextArrangement : #TextFirst  // or #TextLast, #TextOnly, #TextSeparate
    PropertyName
};
```

**Example — Customer field with TextFirst:**
```cds
annotate MyService.SalesOrder with {
    @Common.Text : to_Customer.Name
    @UI.TextArrangement : #TextFirst
    CustomerID
};
```

**Example — Status field with TextOnly (CAP default):**
```cds
annotate MyService.Travel with {
    @Common.Text : TravelStatus.name
    @UI.TextArrangement : #TextOnly
    TravelStatusCode
};
```

**Example — Payment method with TextLast:**
```cds
annotate MyService.Booking with {
    @Common.Text : _Payment.Method
    @UI.TextArrangement : #TextLast
    PaymentMethod : String(1);
    _Payment : Association to one Payment on _Payment.code = PaymentMethod;
};
```

---

### Step 2 — Verify Text Property Is NOT Hidden

Ensure the text property referenced by `Common.Text` is **not** marked as `@UI.Hidden`. Hidden text properties break text arrangement:

```cds
// ❌ WRONG — text property is hidden
annotate MyService.Customer with {
    @UI.Hidden
    Name  // Referenced by Common.Text above
};

// ✅ CORRECT — text property is visible
annotate MyService.Customer with {
    Name  // No @UI.Hidden annotation
};
```

**ESLint integration:** If you have `@sap-ux/eslint-plugin-fiori-tools` configured, the `sap-text-arrangement-hidden` rule will catch this error automatically.

---

### Step 3 — Ensure Association Is Properly Defined

If the text property is in a related entity (via association), verify the association is:
- Defined in the data model
- Included in the service projection
- Accessible from the target entity

```cds
// Data model (db/schema.cds)
entity Travel {
    key ID : UUID;
    TravelStatusCode : String(1);
    TravelStatus : Association to TravelStatus on TravelStatus.code = TravelStatusCode;
}

entity TravelStatus {
    key code : String(1);
    name : String(80);
}

// Service definition (srv/service.cds)
service TravelService {
    entity Travel as projection on db.Travel;  // Association is projected
    entity TravelStatus as projection on db.TravelStatus;
}

// Annotations (app/annotations.cds)
annotate TravelService.Travel with {
    @Common.Text : TravelStatus.name  // Path through association
    @UI.TextArrangement : #TextOnly
    TravelStatusCode
};
```

---

### Step 4 — Rebuild and Verify Metadata

Run `cds watch` to regenerate the metadata:

```bash
cds watch
```

The console should show no errors. Once the server is running, check the metadata at:

```
http://localhost:4004/<service>/$metadata
```

Verify the annotation appears in the metadata XML:

```xml
<Annotations Target="TravelService.Travel/TravelStatusCode">
    <Annotation Term="Common.Text" Path="TravelStatus/name">
        <Annotation Term="UI.TextArrangement" 
            EnumMember="UI.TextArrangementType/TextOnly"/>
    </Annotation>
</Annotations>
```

**Note:** CAP uses the `Common` namespace alias (not `SAP__common` like RAP).

---

## Entity-Level Default (Optional)

Set a **default text arrangement** for an entire entity. Property-level annotations override this default.

```cds
@UI.TextArrangement : #TextLast
entity MyEntity {
    @Common.Text : category.name
    CategoryCode : String(10);  // Inherits #TextLast
    
    @Common.Text : status.name
    @UI.TextArrangement : #TextOnly  // Overrides to #TextOnly
    StatusCode : String(1);
}
```

---

## Common Patterns

### Pattern 1: Association with TextFirst

Foreign key field with associated description (customer, product, agency):

```cds
annotate MyService.Booking with {
    @Common.Text : to_Customer.Name
    @UI.TextArrangement : #TextFirst
    CustomerID : UUID;
    to_Customer : Association to Customer;
};
```

### Pattern 2: Status Field with TextOnly

Status codes where ID is meaningless to users:

```cds
annotate MyService.Order with {
    @Common.Text : OrderStatus.description
    @UI.TextArrangement : #TextOnly
    status_code : Integer;
    OrderStatus : Association to OrderStatus;
};
```

### Pattern 3: Fixed Value List with TextLast

Dropdown with codes that technical users need to see:

```cds
annotate MyService.Product with {
    @Common.Text : _Category.Name
    @UI.TextArrangement : #TextLast
    @Common.ValueListWithFixedValues : true
    @Common.ValueList : {
        CollectionPath: 'ProductCategories',
        Parameters: [{
            $Type : 'Common.ValueListParameterInOut',
            LocalDataProperty: CategoryCode,
            ValueListProperty: 'Code'
        }]
    }
    CategoryCode : String(2);
    _Category : Association to ProductCategory;
};
```

### Pattern 4: Complex Value Help with Text Arrangement

When a field has a value help, ensure consistent text arrangement between the field and its value help entity:

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

// Match the arrangement on the value help entity
annotate MyService.PaymentMethod with {
    @Common.Text : Name
    @UI.TextArrangement : #TextOnly  // Same as field above
    Code : String(1);
};
```

---

## Complete Working Example

Full CAP project with text arrangement:

```cds
// db/schema.cds
namespace my.bookshop;

entity Books {
    key ID : UUID;
    title : String(111);
    author_ID : UUID;
    author : Association to Authors on author.ID = author_ID;
    genre_code : String(2);
    genre : Association to Genres on genre.code = genre_code;
}

entity Authors {
    key ID : UUID;
    name : String(111);
    books : Association to many Books on books.author_ID = ID;
}

entity Genres {
    key code : String(2);
    name : String(80);
    books : Association to many Books on books.genre_code = code;
}

// srv/cat-service.cds
using my.bookshop from '../db/schema';

service CatalogService {
    entity Books as projection on bookshop.Books;
    entity Authors as projection on bookshop.Authors;
    entity Genres as projection on bookshop.Genres;
}

// app/annotations.cds
using CatalogService from '../srv/cat-service';

annotate CatalogService.Books with {
    @Common.Text : author.name
    @UI.TextArrangement : #TextFirst  // "Author Name (UUID)"
    author_ID;
    
    @Common.Text : genre.name
    @UI.TextArrangement : #TextOnly  // "Genre Name" (code hidden)
    genre_code;
};

// Also annotate the value help entities for consistency
annotate CatalogService.Authors with {
    @Common.Text : name
    @UI.TextArrangement : #TextFirst
    ID;
};

annotate CatalogService.Genres with {
    @Common.Text : name
    @UI.TextArrangement : #TextOnly
    code;
};
```

---

## Troubleshooting CAP-Specific Issues

**"Association path not found in metadata"**
- Verify the association is included in the service projection
- Check that the association is defined in the data model
- Ensure the path syntax matches the association name (case-sensitive)

**"cds watch shows annotation warnings"**
- Check CDS syntax (CAP uses `#TextFirst`, not `#TEXT_FIRST`)
- Verify property names and paths are correct
- Look for typos in annotation terms (`Common.Text` not `Common.text`)

**"Metadata doesn't update after changes"**
- Stop and restart `cds watch`
- Clear browser cache
- Check for CDS compilation errors in the terminal

**"Text property is in a different service"**
- Ensure the text property's entity is also exposed in the same service
- Cross-service text references are not supported; both entities must be in the same service projection
