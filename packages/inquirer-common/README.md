[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/inquirer-common/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/inquirer-common)

# [`@sap-ux/inquirer-common`](https://github.com/SAP/open-ux-tools/tree/main/packages/inquirer-common)

Commonly used shared functionality that supports prompting. Currently used by inquirer modules for example `@sap-ux/ui5-application-inquirer`, `@sap-ux/ui5-library-inquirer`. For example, choice searching and UI5 choice grouping. Add functionality that may be used by multiple prompting modules to prompte re-use.

## Extending ABAP Service Offerings

The default list of ABAP service name types can be extended to allow customised ABAP service plans to be shown during the Cloud Foundry ABAP environment flow.

Supported list of technical service name types;

```TypeScript
[
    AbapEnvType.ABAP,
    AbapEnvType.ABAP_TRIAL,
    AbapEnvType.ABAP_CANARY,
    AbapEnvType.ABAP_OEM,
    AbapEnvType.ABAP_OEM_CANARY,
    AbapEnvType.ABAP_HAAS,
    AbapEnvType.ABAP_STAGING,
    AbapEnvType.ABAP_INTERNAL_STAGING
]
```

Configure the `ABAPEnvServiceTypes` environment variable with either a single or comma separated list, to update the existing list;

```bash
# Single
export ABAPEnvServiceTypes=abap-staging
# Multiple
export ABAPEnvServiceTypes=abap-staging,abap-internal
```



## License

Read [License](./LICENSE).

## Keywords
inquirer
SAP
UI5
prompt