# Troubleshooting & Validation Checklist

## Common Errors & Solutions

### Draft Table Errors

**Error**: "Field X not found in draft table" or "DRAFT_TABLE is not a suitable draft persistency"  

**Root Cause**: Draft table field names don't match expected format

**Solution**: Draft table fields must be all lowercase with no underscores

**Field Naming Rules**:
1. Take CDS view field name (e.g., `TravelRequestUUID`)
2. Convert to all lowercase: `travelrequestuuid`
3. Remove all underscores

**Examples**:
- `TravelRequestUUID` → `travelrequestuuid`
- `ParentActivityUUID` → `parentactivityuuid`
- `SiblingOrderNumber` → `siblingordernumber`
- `CreatedBy` → `createdby`
- `LocalLastChangedAt` → `locallastchangedat`

**❌ WRONG**:
- `TravelRequestUUID` (camelCase)
- `travel_request_uuid` (snake_case with underscores)

**✅ CORRECT**:
- `travelrequestuuid` (all lowercase, no underscores)

---

**Error**: "Duplicate key in draft table"  

**Root Cause**: Child draft table missing composite key

**Solution**: For child draft table, BOTH entity UUIDs must be keys

**Correct child draft table keys**:
```abap
key mandt : mandt not null;
key activityuuid : sysuuid_x16 not null;           // Child UUID
key travelrequestuuid : sysuuid_x16 not null;      // Root UUID - MUST be key
```

---

**Error**: "Primary keys do not match" in hierarchy definition

**Root Cause**: Child active table missing composite key (only has child UUID as key, missing root UUID)

**Solution**: Child active table must have composite key

**Correct child active table keys**:
```abap
key client : abap.clnt not null;
key activity_uuid : sysuuid_x16 not null;          // Child UUID
key travel_request_uuid : sysuuid_x16 not null;    // Root UUID - MUST be key
```

**Why**: Hierarchy requires keys = `[client, child_entity_uuid, root_entity_uuid]`

---

### UUID vs ID Confusion

**Error**: "Cannot assign CHAR to UUID field" or "Type mismatch in assignment"

**Root Cause**: Mixing up UUIDs with IDs

**Solution**: Understand the difference

**UUIDs** (sysuuid_x16):
- Technical primary keys
- Generated via `cl_system_uuid=>create_uuid_x16_static()`
- Never entered by users
- Always hidden in UI (`@UI.hidden: true`)
- Example: `ActivityUUID`, `TravelRequestUUID`, `ParentActivityUUID`

**IDs** (NUMC/CHAR):
- Business identifiers
- Can be auto-numbered or user-entered
- Visible in UI
- Example: `ActivityID`, `TravelRequestID`

**Correct field types**:
```abap
// Active table
key activity_uuid : sysuuid_x16 not null;      // Technical key
    activity_id : abap.numc(10);               // Business ID

// Draft table
key activityuuid : sysuuid_x16 not null;       // Technical key
    activityid : abap.numc(10);                // Business ID
```

---

### Hierarchy Not Rendering

**Error**: Tree table shows flat list instead of hierarchy

**Root Cause**: Missing OData hierarchy annotation on child projection

**Solution**: Add `@OData.hierarchy.recursiveHierarchy` to child projection view

```abap
@OData.hierarchy.recursiveHierarchy: [{ entity.name: 'ZI_TravelActivity_HD' }]
define view entity ZC_TravelActivity
  as projection on ZR_TravelActivity
{
  // ... fields
}
```

**Critical**: This annotation is MANDATORY for Fiori Elements to render tree table

---

**Error**: "Element X of hierarchy view Y must not be search enabled in baseview Z"

**Root Cause**: `@Search.searchable` or `@Search.defaultSearchElement` annotations conflict with hierarchy views

**Solution**: Remove ALL search annotations from child projection view when using hierarchy

**❌ WRONG** (causes SADL exposure error):
```abap
@Search.searchable: true
@OData.hierarchy.recursiveHierarchy: [{ entity.name: 'ZI_EMPLOYEE_HD' }]
define view entity ZC_EMPLOYEE
  as projection on ZR_EMPLOYEE
{
  @Search.defaultSearchElement: true
  EmployeeID,
  @Search.defaultSearchElement: true
  EmployeeName,
  // ... other fields
}
```

**✅ CORRECT** (search annotations removed):
```abap
@OData.hierarchy.recursiveHierarchy: [{ entity.name: 'ZI_EMPLOYEE_HD' }]
define view entity ZC_EMPLOYEE
  as projection on ZR_EMPLOYEE
{
  EmployeeID,
  EmployeeName,
  // ... other fields
}
```

**Why**: SADL (Service Adaptation Definition Language) exposure doesn't support search annotations on hierarchy elements. The hierarchy view structure conflicts with search indexing.

**Workaround**: If search is required, implement it at the root entity level (e.g., Department) instead of the hierarchical child entity (e.g., Employee).

---

**Error**: "Hierarchy parameter required" when opening tree table

**Root Cause**: Hierarchy definition missing parameter or directory filter

**Solution**: Hierarchy must have both `with parameters` and `directory` filter

```abap
define hierarchy ZI_TravelActivity_HD
  with parameters
    P_TravelRequestUUID : sysuuid_x16
  as parent child hierarchy(
    source ZI_TravelActivity
    child to parent association _ParentActivity
    directory _TravelRequest filter by
      TravelRequestUUID = $parameters.P_TravelRequestUUID
    start where
      ParentActivityUUID is initial
    siblings order by
      SiblingOrderNumber ascending
  )
{
  key TravelRequestUUID,
  key ActivityUUID,
      ParentActivityUUID,
      SiblingOrderNumber
}
```

**Why**: The directory filter isolates hierarchies by root entity (prevents mixing data from different roots)

---

**Error**: "Association _TravelRequest not found" in hierarchy definition

**Root Cause**: Child interface view missing directory association

**Solution**: Child interface view MUST have association to root/directory entity

```abap
define view entity ZI_TravelActivity
  as select from ztrvl_act
  association [0..1] to ZI_TravelRequest as _TravelRequest  // ← MUST have this
    on $projection.TravelRequestUUID = _TravelRequest.TravelRequestUUID
  // ... other associations
{
  // ... fields
  _TravelRequest  // ← MUST expose this
}
```

**Why**: The hierarchy definition's `directory` clause requires this association for filtering

---

### Parent-Child Link Errors

**Error**: Can't assign parent via drag-and-drop in Fiori UI

**Root Cause**: Missing link/unlink actions in behavior definition

**Solution**: Add link/unlink actions to parent association

```abap
define behavior for ZR_TravelActivity alias TravelActivity
{
  // ... other configuration ...
  
  association _ParentActivity
  {
    with draft;
    link action linkParentActivity;      // ← ADD THIS
    unlink action unlinkParentActivity;  // ← ADD THIS
  }
}
```

**Also verify**: Projection behavior exposes these actions

```abap
define behavior for ZC_TravelActivity alias TravelActivity
{
  use association _ParentActivity { 
    with draft; 
    link action linkParentActivity; 
    unlink action unlinkParentActivity; 
  }
}
```

---

**Error**: "Action changeNextSibling not found"

**Root Cause**: Missing managed reorder action in hierarchy block

**Solution**: Add complete hierarchy block to behavior definition

```abap
define behavior for ZR_TravelActivity alias TravelActivity
{
  // ... other configuration ...
  
  instance hierarchy ZI_TravelActivity_HD
  {
    managed reorder action changeNextSibling;          // ← ADD THIS
    field ( hierarchy-index ) SiblingOrderNumber;
    ascending association _ParentActivity;
    descending association _ChildActivity { with cascading delete; };
  }
}
```

---

### Behavior Definition Errors

**Error**: "JCO system error" when creating behavior definition with `implementationType: "Managed"`

**Root Cause**: Known issue with ABAP MCP tool

**Solution**: Use "Unmanaged" workaround (see Prerequisites guide)

1. Create with `"implementationType": "Unmanaged"`
2. Replace content with full managed definition
3. Activate (will auto-generate implementation classes)

---

**Error**: "Early numbering not declared" or "Early numbering missing"

**Root Cause**: Missing `early numbering` declaration in behavior definition

**Solution**: BOTH root and child behaviors must have `early numbering`

```abap
define behavior for ZR_TravelRequest alias TravelRequest
implementation in class zbp_r_travelrequest unique
early numbering  // ← MUST have this
{
  // ... configuration
}

define behavior for ZR_TravelActivity alias TravelActivity
implementation in class zbp_r_travelactivity unique
early numbering  // ← MUST have this
{
  // ... configuration
}
```

**Why**: UUIDs are generated before saving (early), not during database commit

---

**Error**: "Implementation class not found" or "Class ZBP_R_XXX does not exist"

**Root Cause**: Missing `implementation in class` declaration

**Solution**: Both root and child behaviors must declare implementation class

```abap
define behavior for ZR_TravelRequest alias TravelRequest
implementation in class zbp_r_travelrequest unique  // ← MUST have this
early numbering
{
  // ... configuration
}

define behavior for ZR_TravelActivity alias TravelActivity
implementation in class zbp_r_travelactivity unique  // ← MUST have this
early numbering
{
  // ... configuration
}
```

**Note**: Classes are auto-generated on activation. Leave them empty initially.

---

### Metadata/UI Annotation Errors

**Error**: Tree table not displayed in Object Page

**Root Cause**: Missing `#LINEITEM_REFERENCE` facet in root metadata

**Solution**: Root metadata MUST have facet pointing to child association

```abap
@Metadata.layer: #CORE
annotate entity ZC_TravelRequest with
{
  @UI.facet: [
    {
      id: 'TravelRequestInfo',
      purpose: #STANDARD,
      type: #IDENTIFICATION_REFERENCE,
      label: 'Travel Request Details',
      position: 10
    },
    {
      id: 'TravelActivities',                // ← MUST have this facet
      purpose: #STANDARD,
      type: #LINEITEM_REFERENCE,
      label: 'Travel Activities',
      position: 20,
      targetElement: '_TravelActivity'       // ← Points to child association
    }
  ]
  // ... field annotations
}
```

**Why**: Without this facet, SAP Fiori Elements doesn't know to display the child tree table

---

**Error**: Tree shows items in wrong order

**Root Cause**: Missing presentation variant or incorrect sort order

**Solution**: Child metadata must have presentation variant sorted by SiblingOrderNumber

```abap
@Metadata.layer: #CORE
@UI: {
  presentationVariant: [{
    sortOrder: [{ by: 'SiblingOrderNumber', direction: #ASC }]  // ← ADD THIS
  }]
}
annotate entity ZC_TravelActivity with
{
  // ... field annotations
}
```

---

### Activation Errors

**Error**: "Source entity not found" or "View ZI_XXX does not exist"

**Root Cause**: Trying to activate objects out of sequence

**Solution**: Follow strict sequential activation order

**Correct activation sequence**:
1. Tables (all 4: 2 active + 2 draft)
2. Interface views (root + child)
3. Hierarchy definition
4. Base views + Behavior definition
5. Projection views
6. Projection behavior definition
7. Metadata extensions
8. Service definition + Service binding

**Rule**: Never proceed to the next step until the previous step's objects are successfully activated

---

### Service Binding Errors

**Error**: "Entity not found in service" after publishing

**Root Cause**: Service definition not exposing required entities

**Solution**: Service definition must expose BOTH root and child entities

```abap
@EndUserText.label: 'Travel Itinerary Service'
define service ZTRAVELITINERARY
{
  expose ZC_TravelRequest as TravelRequest;    // ← Root entity
  expose ZC_TravelActivity as TravelActivity;  // ← Child entity
}
```

---

**Error**: Can't publish service binding

**Root Cause**: Errors in underlying metadata or projection behavior

**Solution**: Check activation status of all objects

1. Verify all projection views activated
2. Verify projection behavior activated
3. Verify metadata extensions activated
4. Check for any warnings/errors in service definition

---

## Validation Checklist

### Step 1: Database Tables
- [ ] All 4 tables created (2 active + 2 draft)
- [ ] Draft tables use lowercase field names with no underscores
- [ ] Draft tables have `@AbapCatalog.enhancement.category : #EXTENSIBLE_ANY`
- [ ] Draft tables include `"%admin" : include sych_bdl_draft_admin_inc;`
- [ ] Child draft table has BOTH UUIDs as keys (child UUID + root UUID)
- [ ] All tables activated without errors

### Step 2: Interface Views
- [ ] Root interface view has composition to child
- [ ] Child interface view has three associations:
  - [ ] `_TravelRequest [0..1]` to root (directory)
  - [ ] `_ParentActivity [0..1]` to self (parent)
  - [ ] `_ChildActivity [0..*]` to self (children)
- [ ] All associations expose in select list
- [ ] All views activated without errors

### Step 3: Hierarchy Definition
- [ ] Has `with parameters` section
- [ ] Has `directory` filter with parameter
- [ ] Has `child to parent association` (upward link)
- [ ] Has `start where` clause (identifies roots)
- [ ] Has `siblings order by` clause
- [ ] Activated without errors

### Step 4: Base Views & Behavior
- [ ] Root base view has composition to child
- [ ] Child base view has same three associations as interface view
- [ ] Both root AND child behaviors have `early numbering`
- [ ] Both root AND child behaviors have `implementation in class`
- [ ] Child behavior has link/unlink actions on parent association
- [ ] Child behavior has complete hierarchy block:
  - [ ] `managed reorder action changeNextSibling`
  - [ ] `field ( hierarchy-index ) SiblingOrderNumber`
  - [ ] `ascending association _ParentActivity`
  - [ ] `descending association _ChildActivity { with cascading delete; }`
- [ ] Behavior definition activated
- [ ] Implementation classes auto-generated (empty)

### Step 5: Projection Views
- [ ] Root projection redirects child association
- [ ] Child projection has `@OData.hierarchy.recursiveHierarchy` annotation
- [ ] Child projection redirects all three associations (parent, up, down)
- [ ] All projections activated

### Step 6: Projection Behavior
- [ ] Both root AND child have `use etag`
- [ ] Child exposes `use action changeNextSibling`
- [ ] Child exposes link/unlink actions on parent association
- [ ] Activated without errors

### Step 7: Metadata Extensions
- [ ] Root metadata has `#LINEITEM_REFERENCE` facet pointing to child
- [ ] Child metadata has `presentationVariant` sorted by SiblingOrderNumber
- [ ] All UUID fields marked `@UI.hidden: true`
- [ ] All admin fields (CreatedBy, etc.) marked `@UI.hidden: true`
- [ ] Business fields have `@UI.lineItem` and `@UI.identification` annotations
- [ ] All metadata activated

### Step 8: Service & Binding
- [ ] Service definition exposes both entities
- [ ] Service definition activated
- [ ] Service binding created (OData V4 - UI)
- [ ] Service binding activated
- [ ] Service binding published successfully

---

## Debugging Tips

### View Activation Logs
When activation fails:
1. Check error messages carefully
2. Identify which object failed (view, table, behavior)
3. Verify all dependencies are activated
4. Check field names match between layers

### Test Service Metadata
After publishing service:
1. Open service binding in ADT
2. Click "Service URL" to view metadata
3. Verify both entities are exposed
4. Check hierarchy annotation on child entity

### Verify Hierarchy in UI
1. Preview service in Fiori Elements
2. Create a root entity
3. Navigate to Object Page
4. Verify child tree table appears
5. Try creating child items
6. Test expand/collapse functionality

### Common Verification Queries

**Check table exists and has data**:
```sql
SELECT * FROM ztrvl_act UP TO 10 ROWS
```

**Verify hierarchy structure**:
```sql
SELECT activity_id, parent_activity_uuid, sibling_order_number
FROM ztrvl_act
ORDER BY travel_request_uuid, sibling_order_number
```

**Check draft table**:
```sql
SELECT * FROM ztrvl_act_d UP TO 10 ROWS
```

---

## When to Ask for Help

If you encounter:
- Persistent activation errors after following checklist
- Errors not covered in this troubleshooting guide
- Service binding that won't publish despite all objects being active
- Hierarchy displaying incorrectly in Fiori UI

**Recommended approach**:
1. Document the exact error message
2. Note which step failed (Step 1-8)
3. Share activation logs
4. Provide object names (tables, views, behaviors)
5. Ask user or consult SAP documentation

---

## References

- **[Editable Treeviews: Development Process in Overview](https://help.sap.com/docs/abap-cloud/abap-rap/editable-treeviews-development-process-in-overview)**
