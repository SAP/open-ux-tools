---
"@sap-ux/cf-deploy-config-writer": patch
---

fix(cf-deploy-config-writer): align xs-security.json and XSUAA mta.yaml config with CDS convention

The xs-security.json no longer includes xsappname and tenant-mode fields; these now live exclusively in the XSUAA resource config block in mta.yaml, matching the output of `cds add mta`. The standalone router XSUAA resource (addUaa) now includes the config block with xsappname and tenant-mode using the ${org}-${space} variable pattern.
