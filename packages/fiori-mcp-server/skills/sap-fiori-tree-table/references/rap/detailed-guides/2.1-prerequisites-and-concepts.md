# Prerequisites & Core Concepts

## Prerequisites

- ABAP system with RAP and OData V4 support
- Package created (local `$TMP` or transportable)
  - **Local packages** (e.g., `$TMP`, `Z<namespace>`, `TEST<namespace>`): No transport request is required
  - **Transportable packages**: Transport request must be provided when creating/modifying objects
- Understanding of your business entities (directory and hierarchical child)
- **ADT MCP Tools activated**: Run `activate_abap_object_management_tools()` at the start of your session to enable write operations
  - This activates creation, validation, activation, and transport management tools
  - Without activation, the MCP tools operate in read-only mode

## Core Architecture Pattern

**When using RAP Generator (Option 1):**
The generator creates a 3-layer architecture. You will **modify existing layers** rather than creating new ones:

1. **Persistent Layer**: Tables (generated) → **Modify to add hierarchy fields**
2. **Base View Layer**: `ZR_*` views (generated) → **Add self-referencing associations and hierarchy fields**
3. **Hierarchy Definition**: **Create new** CDS hierarchy with directory filter
4. **Behavior Layer**: Behavior definitions (generated) → **Update to add hierarchy actions**
5. **Projection Layer**: `ZC_*` views (generated) → **Update to add OData hierarchy annotation**

**When following SAP Documentation (Option 2):**
Refer to the official SAP documentation for the complete 5-layer architecture and implementation details.

## CRITICAL: ABAP Object Creation Workflow

⚠️ **The ABAP MCP creation tool creates skeleton objects only** - you MUST populate them afterward.

### Correct 3-Step Workflow for ALL Objects:

1. **Create skeleton** with metadata only (name, package, description):
   ```json
   {
     "packageName": "TEST_VHK_ABAP5",
     "name": "ZORG_HDR",
     "description": "Organization Header - Active Table"
   }
   ```
   - Returns file path (e.g., `abap:/repotree-v1/.../zorg_hdr.tabl.ddic`)
   - Object is created but empty (only has `key client : abap.clnt not null;`)

2. **Edit file** to add complete content using `replace_string_in_file`:
   - Read the created file first
   - Replace the skeleton content with full DDL definition (fields, annotations, etc.)

3. **Activate** using `mcp_adt_mcp_serve_abap_activate_objects`

### ❌ WRONG Approach (Will Fail):
```json
{
  "objectName": "ZORG_HDR",
  "packageName": "TEST_VHK_ABAP5", 
  "description": "...",
  "content": "define table zorg_hdr { ... }"  // ❌ This will cause error
}
```
**Error**: `Cannot invoke "String.toLowerCase(java.util.Locale)" because "adtObjectName" is null`

### ✅ CORRECT Approach:
```
Step 1: create_object with minimal metadata
Step 2: replace_string_in_file to populate fields/content
Step 3: activate_objects to activate
```

This applies to **ALL object types**: tables, CDS views, behavior definitions, metadata extensions, service definitions.

### ⚠️ SPECIAL CASE: Behavior Definitions (BDEF/BDO)

Behavior definitions have a **known creation issue** with `implementationType: "Managed"`. Use this workaround:

**Step 1: Create with "Unmanaged"** (this works):
```json
{
  "behaviorDefinitionType": "definition",
  "packageName": "TEST_VHK_ABAP5",
  "rootEntity": "ZR_ORGANIZATION",
  "name": "ZR_ORGANIZATION",
  "description": "Organization Behavior Definition",
  "implementationType": "Unmanaged"  // ← Use "Unmanaged" to create skeleton
}
```

**Step 2: Replace skeleton with managed content**:
- Read the generated unmanaged skeleton
- Replace entire content with full managed behavior definition (managed, strict, with draft, etc.)

**Step 3: Activate**:
- Activation will succeed and auto-generate implementation classes (ZBP_R_* classes)

**Why this works**:
- `"implementationType": "Managed"` → causes JCO system error during creation
- `"implementationType": "Unmanaged"` → creates skeleton successfully
- You can then replace "unmanaged" with full "managed" content before activation

## Implementation Strategy

**Phase 1: Planning** (ALWAYS do this first)
1. Create `<PROJECT>_IMPLEMENTATION_PLAN.md` with:
   - Complete object list with naming conventions
   - Field specifications for all tables and views
   - Validation checkpoints for each step
   - Testing scenarios
2. Present plan to user and wait for approval

**Phase 2: Step-by-Step Execution** (After plan approval)
1. Create objects for ONE step only
2. Activate all objects in that step
3. Validate activation was successful
4. Show user the results and ask: "Step X completed successfully. Ready to proceed to Step Y?"
5. Wait for user confirmation
6. Move to next step

**Phase 3: Validation & Testing** (After all steps)
1. Publish service binding
2. Preview in Fiori Elements
3. Test hierarchical operations
4. Document any issues

## User Communication Guidelines

### Throughout Implementation:

1. **Be transparent about progress**: After each activation, show what was created
2. **Pause for confirmation**: Never rush to the next step without user approval
3. **Explain dependencies**: When moving to next step, briefly explain why previous step was needed
4. **Handle errors gracefully**: If activation fails, STOP immediately, show the error, and ask how to proceed
5. **Provide context**: Remind users which step they're on (e.g., "Step 3 of 8: Hierarchy Definition")
6. **Estimate remaining work**: Let users know what's left (e.g., "5 more steps to complete")

### Communication Patterns:

**Starting**: "I've analyzed your requirements and created a detailed implementation plan. This will involve 8 sequential steps. Would you like to review the plan first, or should we proceed with Step 1?"

**Between steps**: "✓ Step X completed successfully. Objects activated: [list]. Ready to proceed to Step Y: [name]?"

**On errors**: "⚠️ Activation error in Step X: [error message]. I recommend [solution]. Should I attempt to fix this, or would you like to review the error first?"

**Completion**: "🎉 All 8 steps completed! The service is published and ready for testing. Would you like to: 1) create a SAP Fiori elements application, 2) Create test data, or 3) Review the implementation?"

## Key Features Enabled

After completing all steps, your service will support:

✅ **Tree table rendering** with expand/collapse  
✅ **Drag-and-drop parent assignment** (linkParentActivity/unlinkParentActivity)  
✅ **Managed reordering** (changeNextSibling action moves items up/down)  
✅ **Unlimited nesting levels** (parent-child recursion)  
✅ **Draft support** (create, edit, activate, discard)  
✅ **Cascading delete** (deleting parent removes all children)  
✅ **Proper sequencing** (SiblingOrderNumber maintains sibling order)  

## References

- **[Editable Treeviews: Development Process in Overview](https://help.sap.com/docs/abap-cloud/abap-rap/editable-treeviews-development-process-in-overview)**
