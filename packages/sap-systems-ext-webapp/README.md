# Connection Manager for SAP Systems (Webapp)


This web application is part of the **Connection Manager for SAP Systems** extension. It provides the front-end interface that allows users to view, configure, and manage SAP system connections directly within the IDE.

During development, the webapp can be built and served locally for faster iteration and debugging. When packaged, it is bundled under the extension’s `dist/webapp` directory and loaded at runtime.

### Developer Note
When making changes to this module, you are also required to add `sap-ux-sap-systems-ext` to the changeset in order for the extension to be released with the changes. This is due to the fact that this package is private and therefore excluded from the changesets release workflow.