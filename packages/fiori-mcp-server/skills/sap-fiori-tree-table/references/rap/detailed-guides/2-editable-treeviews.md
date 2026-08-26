# ABAP RAP Editable Treeviews with Draft - Quick Start Guide

📖 **CRITICAL:** Before starting, review [RAP Generator Requirements](./0-rap-generator-requirements.md) for correct generator usage.

---

## Choose Your Implementation Approach

Ask user to choose from the following options:

### Option 1: RAP Generator + Modifications ⭐ **RECOMMENDED**

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

**📖 Detailed Guide**: [With Generator Implementation](./2.3-with-generator.md)

---

### Option 2: Manual Implementation (Referring to Official SAP Documentation) 📚

**For**: Experienced ABAP developers who want full control and deep learning

**Workflow**: Follow SAP's official documentation to manually create all artifacts

**Documentation**: [Editable Treeviews: Development Process in Overview](https://help.sap.com/docs/abap-cloud/abap-rap/editable-treeviews-development-process-in-overview)

**Background Reading**: For conceptual understanding, read [Treeviews Introduction](./2.2-treeviews-introduction.md):
- What treeviews are and business context
- Available features (managed vs unmanaged)
- Hierarchy directories explained
- Architecture comparison (read-only vs editable)

**After completion**: Proceed to frontend application generation

---

## Supporting Documentation

📋 **Prerequisites & Core Concepts**: [Prerequisites and Concepts](./2.1-prerequisites-and-concepts.md)
- ABAP object creation workflow
- Architecture patterns (3-layer for generator, 5-layer for manual)
- Behavior definition workarounds
- Communication guidelines

🔧 **Troubleshooting & Validation**: [Troubleshooting Checklist](./2.4-troubleshooting-checklist.md)
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

## Next Steps After Backend Completion - Ask User

1. **Create Fiori Elements App** - Before generating, verify system availability using fiori mcp to ensure the target ABAP system is accessible. Then download metadata and generate the app with TreeTable configuration for the hierarchy entity.
2. **Generate Test Data**:  Create data population program
3. **⚠️ Implement Business Logic** - The generated backend provides scaffolding (structure + declarations). Hierarchy operations like `changeNextSibling`, `linkParentProduct`, `unlinkParentProduct` require manual implementation in the behavior class. See detailed status in implementation guide.
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

## Sample Prompt for Complete Implementation

```
/sap-fiori-tree-table 
Create OData V4 service with editable tree table for Department-Employee hierarchy.

Department (root entity) with: Department ID, Name, Country, Address

Employee (child composition) with: Employee ID, Name, Job Title, 
Manager (self-reference for hierarchy), Location, Employment Status

Package: <PACKAGE_NAME>
Transport request: (Local - No transport) OR <TRANSPORT_NUMBER>
Hierarchy Type: Edit with Draft
Hierarchy Structure: Employees with manager-employee hierarchy
System:  <SYSTEM_ID> client <CLIENT>
```

## References

- **[SAP Documentation: Editable Treeviews Development Process](https://help.sap.com/docs/abap-cloud/abap-rap/editable-treeviews-development-process-in-overview)**
- **[SAP Documentation: Treeview Features (Business Logic Implementation)](https://help.sap.com/docs/abap-cloud/abap-rap/treeview-features)**
- **Prerequisites & Concepts**: [Prerequisites and Concepts](./2.1-prerequisites-and-concepts.md)
- **Option 1 Guide**: [With Generator Implementation](./2.3-with-generator.md)
- **Troubleshooting**: [Troubleshooting Checklist](./2.4-troubleshooting-checklist.md)
