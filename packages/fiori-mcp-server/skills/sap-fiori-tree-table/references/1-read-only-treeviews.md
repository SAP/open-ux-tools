# ABAP RAP Read-Only Treeviews - Implementation Guide

**Use ADT MCP RAP generator to create base business object:**
- RAP generator creates the foundation (tables, views, behavior definitions)

**CRITICAL Requirements (from below referenced SAP documentation):**
- ✅ Database table with parent field (e.g., `parent_uuid`, `parent_ID`, `manager`)
- ✅ Interface view must have self-referencing association
  ```abap
  association [0..1] to INTERFACE_VIEW as _Parent on $projection.<ParentField> = _Parent.<KeyField>
  ```
- ✅ Hierarchy uses `define hierarchy` syntax (not `define view entity`)
  ```abap
  define hierarchy HIERARCHY_NAME as parent child hierarchy(
    source INTERFACE_VIEW
    child to parent association _Parent
    start where <ParentField> is initial
    siblings order by <SortField>
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
- ❌ Never create ABAP programs for populating test data (optional helper class OK)
- ✅ All objects must be activated in correct order: Table → Interface → Hierarchy → Projection → Service → Binding

**After implementation:**
- Activate all objects in correct order
- Verify `@OData.hierarchy.recursiveHierarchy` annotation is in projection view
- Return to Step 1 to extract Qualifier from metadata

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

## References

- **[Treeviews with Read-Only Capabilities](https://help.sap.com/docs/abap-cloud/abap-rap/treeview-with-read-only-capability)** - Architecture overview