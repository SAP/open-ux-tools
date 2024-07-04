---
'@sap-ux/fiori-freestyle-writer': major
'@sap-ux/ui5-application-writer': major
'@sap-ux/fiori-elements-writer': major
'@sap-ux/generator-simple-fe': major
---

This change set prepares the packages for a mojor release by enhancing project type handling across relevant packages by making projectType mandatory in the App interface. Implemented exclusion logic to prevent the writing of UI5 local YAML and .gitignore files for projects identified with a CAP projectType.
