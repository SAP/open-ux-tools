---
'@sap-ux/fiori-freestyle-writer': major
'@sap-ux/ui5-application-writer': major
'@sap-ux/fiori-elements-writer': major
'@sap-ux/generator-simple-fe': major
'@sap-ux/fiori-generator-shared': minor
'@sap-ux/odata-service-writer': minor
---

Add `projectType` mandatory option to `App` interface to specify the type of project being processed. This option determines file inclusion/exclusion and script updates in the template:
- For projects of type 'CAPJava' or 'CAPNodejs':
  - Exclude `ui5-local.yaml` and `.gitignore` from the template.
  - Update `package.json` to include only the script `deploy-config`.
  - Use full URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.
- For projects of type 'EDMXBackend':
  - Include `ui5-local.yaml` and `.gitignore` in the template.
  - Update `package.json` to include the following scripts: start, start-local, build, start-noflp, start-mock, int-test, deploy, and sap-ux.
  - Include relative URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.


