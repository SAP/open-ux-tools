# ABAP RAP Editable Treeviews with Draft - Quick Start Guide

## Choose Your Implementation Approach

Ask user to choose from the following options:

### Option 1: Manual Implementation (Using SAP Documentation) 📚

**For**: Experienced ABAP developers who want full control and deep learning

**Workflow**: Follow SAP's official documentation to manually create all artifacts

**Documentation**: [Editable Treeviews: Development Process in Overview](https://help.sap.com/docs/abap-cloud/abap-rap/editable-treeviews-development-process-in-overview)

**Background Reading**: For conceptual understanding, read `2.2-treeviews-introduction.md`:
- What treeviews are and business context
- Available features (managed vs unmanaged)
- Hierarchy directories explained
- Architecture comparison (read-only vs editable)

**After completion**: Proceed to frontend application generation

---

### Option 2: RAP Generator + Modifications ⭐ **RECOMMENDED**

**For**: Teams using RAP generator who want guided step-by-step modifications

**Time**: 30-45 minutes

**Key Advantage**: Modify existing generated objects instead of creating from scratch
- Simpler, faster implementation
- Aligns with generator's 3-layer architecture
- Fewer objects to manage

**Workflow**:
1. RAP generator creates foundation (tables, views, behaviors, service)
2. Modify tables to add hierarchy fields
3. Enhance views with self-referencing associations
4. Create hierarchy definition
5. Update behavior with hierarchy actions
6. Add OData hierarchy annotation
7. Update metadata for tree table display
8. Test and publish

**Transport Required**: Depends on package type ($TMP: No, Others: Yes)

**📖 Detailed Guide**: See `2.3-option2-with-generator.md`

---

### Option 3: Fully Automated Step-by-Step (From Scratch) 🔧

**For**: Learning the complete 5-layer architecture or when generator unavailable

**Time**: 60-90 minutes

**Complexity**: High (requires sequential execution)

**Workflow**: Create everything manually - tables, interface views, hierarchy, behaviors, projections, metadata, service

**Transport Required**: Depends on package type ($TMP: No, Others: Yes)

**📖 Detailed Guide**: See `2.4-option3-without-generator.md`

---

## Supporting Documentation

📋 **Prerequisites & Core Concepts**: `2.1-prerequisites-and-concepts.md`
- ABAP object creation workflow
- Architecture patterns (3-layer vs 5-layer)
- Behavior definition workarounds
- Communication guidelines

🔧 **Troubleshooting & Validation**: `2.5-troubleshooting-checklist.md`
- Common errors and solutions
- Draft table field naming rules
- UUID vs ID confusion fixes
- Comprehensive validation checklist

---

## Implementation Workflow (All Options)

**Phase 1: Planning** ✓
1. Create implementation plan document
2. Present to user
3. Wait for approval

**Phase 2: Step-by-Step Execution** 🔨
1. Execute ONE step at a time
2. Activate objects
3. Validate activation
4. Show results to user
5. Ask before proceeding to next step

**Phase 3: Validation & Testing** ✅
1. Publish service binding
2. Create fiori elements application

---

## Key Features Enabled

After completion, your service will support:

✅ Tree table rendering with expand/collapse
✅ Drag-and-drop parent assignment
✅ Managed reordering (move items up/down)
✅ Unlimited nesting levels
✅ Draft support (create, edit, activate, discard)
✅ Cascading delete
✅ Proper sibling sequencing

---

## Next Steps After Backend Completion

1. **Create Fiori Elements App**: Use fiori-frontend skill
2. **Generate Test Data**: Create population program
3. **Implement Business Logic**: Add validation, determinations
4. **Add Authorization**: Replace `#NOT_REQUIRED` with proper auth

---

## Quick Reference

**Common Issues**:
- Draft table field names → lowercase, no underscores
- Composite keys required → child draft needs both UUIDs as keys
- Hierarchy not rendering → missing `@OData.hierarchy.recursiveHierarchy` annotation
- Can't link parent → missing link/unlink actions

**Critical Associations** (in child entity):
1. Directory association → parent root entity
2. Parent association → self-reference upward
3. Children association → self-reference downward

**Mandatory UI Annotations**:
- Root: `#LINEITEM_REFERENCE` facet for child tree table
- Child: `presentationVariant` sorted by SiblingOrderNumber
- Child projection: `@OData.hierarchy.recursiveHierarchy` annotation

---

## References

- **[SAP Documentation](https://help.sap.com/docs/abap-cloud/abap-rap/editable-treeviews-development-process-in-overview)**
- **Prerequisites & Concepts**: `2.1-prerequisites-and-concepts.md`
- **Option 2 Guide**: `2.3-option2-with-generator.md`
- **Option 3 Guide**: `2.4-option3-without-generator.md`
- **Troubleshooting**: `2.5-troubleshooting-checklist.md`
