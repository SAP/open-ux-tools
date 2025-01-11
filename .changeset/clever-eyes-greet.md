---
'@sap-ux/fiori-freestyle-writer': major
'@sap-ux/odata-service-inquirer': major
'@sap-ux/fiori-elements-writer': major
'@sap-ux/generator-simple-fe': patch
---

Adds support for entity related prompting. Update some exported types `fiori-elements-writer`, `fiori-freestyle-writer` to remove problematic enum usage.
The major version updates for modules `@sap-ux/fiori-elements-writer` and `@sap-ux/fiori-freestyle-writer` indicates a breaking change of type definitions:
`@sap-ux/fiori-elements-writer`:
 `TemplateType`
 `TableType`
 `TableSelectionMode`

 `@sap-ux/fiori-freestyle-writer`:
 `TemplateType`

These changes are required to reduce the impact of consuming these types by consumers. Previously defined as enums, requiring full dependencies and bloating 
consumer code where only these types are reuired. The new type defintions still allow both uses (type or value) but the `enums` are now defined as `const`.
This change requires updates to consuming code where the type is imported and referenced.  
Example where a single enum was used as a value type:

```
type Template = {
    template: TemplateType.ListReportObjectPage
}
```

should now be defined as:

```
type Template = {
    template: typeof TemplateType.ListReportObjectPage
}
```
