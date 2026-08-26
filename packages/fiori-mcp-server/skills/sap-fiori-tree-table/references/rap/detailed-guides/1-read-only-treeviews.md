# ABAP RAP Read-Only Treeviews - Implementation Guide

**Use the ADT MCP RAP generator to create the base business object:**
- The RAP generator creates the foundation (tables, views, behavior definitions)
- Creates `define table entity` (modern ABAP Cloud syntax - CDS table + view in one)
- 📖 **CRITICAL:** See [RAP Generator Requirements](./0-rap-generator-requirements.md) for correct usage

**CRITICAL Requirements (from below referenced SAP documentation):**
- ✅ Database table (hierarchy entity) must have a parent reference field (e.g., `ManagerID`) linking to a key field (e.g., `EmployeeID` marked as primary or composite key)
- ✅ Interface view or base view (hierarchy entity) must have self-referencing association
  ```abap
  association [0..1] to INTERFACE_VIEW as _Parent on $projection.<ParentField> = _Parent.<KeyField>
  ```
  Example (employee-manager hierarchy):
  ```abap
  _Manager : association to VIEW on $projection.ManagerID = _Manager.EmployeeID; (EmployeeID should be primary/composite key)
  ```
- ✅ Hierarchy uses `define hierarchy` syntax (not `define view entity`)
  ```abap
  define hierarchy HIERARCHY_NAME as parent child hierarchy(
    source INTERFACE_VIEW
    child to parent association _Parent
    start where <ParentField> is initial
    siblings order by <KeyField>
  )
  ```
- ✅ Projection view must have `@OData.hierarchy.recursiveHierarchy` annotation
  ```abap
  @OData.hierarchy.recursiveHierarchy:[{ entity.name: 'HIERARCHY_NAME' }]
  ```
- ✅ Projection view must redirect parent association to itself
  ```abap
  _Parent : redirected to PROJECTION_VIEW
  ```

**Additional Notes:**
- ❌ No "Create Hierarchy" tool in ADT/MCP - must create Data Definition manually
- ✅ Create Data Definition first → replace with `define hierarchy` syntax
- ❌ Never create ABAP programs for populating test data (optional helper class is OK)
- ✅ All objects must be activated in the correct order: Table → Interface → Hierarchy → Projection → Service → Binding
- ✅ **Hide UUID fields from UI:** Add `@UI.hidden: true` to UUID and ParentUUID fields in the metadata extension (technical UUIDs only, not SiblingOrderNumber)

**After implementation:**
- Activate all objects in the correct order
- Verify the `@OData.hierarchy.recursiveHierarchy` annotation is in the projection view
- Return to Step 1 to extract the Qualifier from metadata

## Next Steps After Backend Completion - Ask User

1. **Create Fiori Elements App** - Before generating, verify system availability using fiori mcp to ensure the target ABAP system is accessible. Then download metadata and generate the app with TreeTable configuration for the hierarchy entity.
2. **Generate Test Data**: Create data population program

### RAP Errors

**"Entity references hierarchy which contains errors"**
- Use `define hierarchy` (not `define view entity`)
- Created as Data Definition (DDLS/DF)
- Activate in correct order

**"Primary keys don't match"**
```abap
// ❌ Wrong
define hierarchy HIERARCHY_NAME as parent child hierarchy(...) {
  UUID,  // Missing key!
}

// ✅ Correct
define hierarchy HIERARCHY_NAME as parent child hierarchy(...) {
  key UUID,
}
```

**"No parent association found"**
```abap
// ❌ Wrong
define root view entity C_Entity as projection on R_Entity {
  _ParentCategory  // Not redirected!
}

// ✅ Correct
define root view entity C_Entity as projection on R_Entity {
  _ParentCategory : redirected to C_Entity
}
```

**"child to parent association not found"**
- Add self-association in interface view (R_*)

**"Hierarchy cannot be activated"**
- Activate order: Table → Interface → Hierarchy → Projection → Service → Binding
- Use mass activation
- Check syntax errors first

**"Association target does not exist"**
- Create and activate projection view first

**"hierarchyQualifier not found"**
- Extract EXACT Qualifier from `metadata.xml`
- Search for `SAP__hierarchy.RecursiveHierarchy`
- Case-sensitive match required

**"Failed to parse metadata"**
- Check activation errors in all objects
- Verify service binding is published (not just activated)
- Ensure OData V4 (not V2)
- Check transport issues

**"TreeTable not rendering"**
- `hierarchyQualifier` matches metadata exactly
- Projection view redirects parent association
- Hierarchy annotation in service metadata
- Clear browser cache

**"Data not loading"**
- Database table has parent-child data
- Parent ID references existing records
- Root items have NULL parent ID
- Interface view association correct
- Hierarchy `start where` clause correct

## Sample Prompt for Complete Implementation

```
/sap-fiori-tree-table 
Create an OData V4 service and SAP Fiori elements List Report application with a hierarchical tree table for the Employee entity.

The hierarchy should be read-only and display employees in a manager-employee structure.

The Employee entity has the following fields: Employee ID (primary key), Name, Job Title, Manager (self-reference for hierarchy), Location, Employment Status.

Package: <PACKAGE_NAME>
Transport request: (Local - No transport) OR <TRANSPORT_NUMBER>
Hierarchy Type: Read-only (display only)
Hierarchy Structure: Employees with manager-employee hierarchy
System: <SYSTEM_ID> client <CLIENT>
```

## References

- **[Treeviews with Read-Only Capabilities](https://help.sap.com/docs/abap-cloud/abap-rap/treeview-with-read-only-capability)** - Architecture overview