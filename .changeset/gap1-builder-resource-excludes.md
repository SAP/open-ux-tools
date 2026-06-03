---
"@sap-ux/ui5-config": patch
"@sap-ux/abap-deploy-config-writer": patch
"@sap-ux/adp-tooling": patch
"@sap-ux/cf-deploy-config-writer": patch
---

fix(ui5-config): add addBuilderResourceExcludes() to ensure builder.resources.excludes is written to both ui5.yaml and ui5-deploy.yaml

Addresses Gap 1 from issue #4756. Previously builder.resources.excludes was only appended inside addAbapDeployTask/addCloudFoundryDeployTask, so the base ui5.yaml never received these excludes. A new idempotent addBuilderResourceExcludes() method is added to UI5Config; abap-deploy-config-writer's updateBaseConfig now calls it unconditionally and always writes the base config file; getDeployConfig calls it before addAbapDeployTask. adp-tooling and cf-deploy-config-writer updated to maintain existing deploy yaml output.
