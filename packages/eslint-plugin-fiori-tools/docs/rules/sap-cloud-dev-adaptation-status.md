# sap-cloud-dev-adaptation-status

## Rule Details

This rule ensures that `cloudDevAdaptationStatus` is defined in the `sap.fiori` section of the `manifest.json` file.

The `cloudDevAdaptationStatus` property represents the release status for the developer adaptation in the cloud.
The following types are supported: 
- `released`: The app is fully open for cloud adaptation projects and variant generation.
- `deprecated`: Marks older extension pathways that are phased out or no longer recommended.
- `obsolete`: The app is locked and not enabled for cloud-ready adaptation.

## Why Was This Introduced?

SAP S/4HANA applications are required to declare their cloud dev adaptation status.

## Warning Examples

The following configurations trigger a warning because `cloudDevAdaptationStatus` is absent:

```json
{
  "sap.fiori": {
    "registrationIds": [],
    "archeType": "transactional"
  }
}
```

**Warning message:** "The application hasn't set a release status for the developer adaptation in the cloud."

## Correct Pattern

```json
{
  "sap.fiori": {
    "registrationIds": [],
    "archeType": "transactional",
    "cloudDevAdaptationStatus": "released"
  }
}
```

## How to Fix

Add a `cloudDevAdaptationStatus` entry inside the `sap.fiori` section of your `manifest.json` file with a selected value.

## Bug Report

Report issues at: https://github.com/SAP/open-ux-tools/issues

## Further Reading

- [Releasing an SAP Fiori Application to Be Extensible in Adaptation Projects](https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/104620657c3b4723ad142e0d1f94d8e1.html)
