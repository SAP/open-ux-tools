---
"@sap-ux/inquirer-common": minor
"@sap-ux/odata-service-inquirer": minor
"@sap-ux/fiori-generator-shared": patch
---

feat(inquirer-common): add ShowOutputTabLink and OutputTabLinkResult types; add showOutputTabLink property to YUIQuestion, InputQuestion, ListQuestion, ConfirmQuestion, CheckBoxQuestion

feat(odata-service-inquirer): set showOutputTabLink: 'validationMessageOverflow' on service URL, credentials, service selection and CAP project questions so the output tab link appears when validation errors overflow 2 lines

refactor(fiori-generator-shared): remove dead ExternalServiceConfig type and externalServices field from AppConfig
