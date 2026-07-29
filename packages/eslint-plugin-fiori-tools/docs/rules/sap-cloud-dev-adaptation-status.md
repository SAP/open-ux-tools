# sap-cloud-dev-adaptation-status

## Rule Details

This rule ensures that `cloudDevAdaptationStatus` is defined in the `sap.fiori` section of `manifest.json`.

The `cloudDevAdaptationStatus` property indicates whether the application supports cloud-based UI adaptation (key user adaptation). Without this property, the adaptation status is undefined, which can prevent key users from adapting the app.

## Why Was This Introduced?

S/4HANA applications are required to declare their cloud dev adaptation status explicitly in the manifest so that the platform can determine whether UI adaptation is supported or not.

## Warning Examples

The following configuration will trigger a warning because `cloudDevAdaptationStatus` is absent:

```json
{
  "sap.fiori": {
    "registrationIds": [],
    "archeType": "transactional"
  }
}
```

**Warning message:** `"cloudDevAdaptationStatus" must be defined in the "sap.fiori" section of the manifest.json.`

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

Add a `cloudDevAdaptationStatus` entry inside the `sap.fiori` section of your `manifest.json` with an appropriate value (`"deprecated"`, `"obsolete"` or `"released"`).

## Bug Report

Report issues at: https://github.com/SAP/open-ux-tools/issues

