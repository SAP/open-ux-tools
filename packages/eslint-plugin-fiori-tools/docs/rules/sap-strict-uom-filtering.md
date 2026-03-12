# Disallow Setting `disableStrictUomFiltering` to `true` in SAP FE App Configuration (`sap-strict-uom-filtering`)

Ensures that the `disableStrictUomFiltering` property is not set to `true` in the `sap.fe.app` configuration in the `manifest.json` file. Applies to OData V4 applications only.

## Rule Details

This rule checks if the `disableStrictUomFiltering` property is set to `true` in the `sap.fe.app` configuration within the `manifest.json` file of OData V4 applications (UI5 version 1.143 or higher). Setting this property to `true` disables strict unit-of-measure filtering, which can result in incorrect filter behavior when users filter by fields that use units of measure. This rule ensures the correct configuration for unit-of-measure filtering.

### Why Was This Rule Introduced?

Strict unit-of-measure (UOM) filtering ensures that filter values are correctly associated with their units of measure, preventing inaccurate query results. Disabling this feature by setting `disableStrictUomFiltering` to `true` is not recommended as it may lead to unexpected filtering behavior for end users.

### Warning Message

The following patterns are considered warnings:

#### Incorrect Manifest Configuration

```json
{
  "sap.fe": {
    "app": {
      "disableStrictUomFiltering": true
    }
  }
}
```

The `disableStrictUomFiltering` property is set to `true`, which disables strict UOM filtering and is not recommended.

### Correct Manifest Configurations

#### Property Absent (Recommended)

```json
{
  "sap.fe": {
    "app": {}
  }
}
```

#### Property Explicitly Set to `false`

```json
{
  "sap.fe": {
    "app": {
      "disableStrictUomFiltering": false
    }
  }
}
```

## Fix

The auto-fix removes the `disableStrictUomFiltering` property from the manifest, restoring the default strict UOM filtering behavior.

## When Not to Use This Rule

If your application intentionally disables strict UOM filtering due to a specific backend or data model constraint, you can disable this rule for the affected manifest file using an ESLint disable comment or configuration.

## Further Reading

- [UI5 Configuring Filter Fields](https://ui5.sap.com/#/topic/f5dcb29da3bf4e0091eba3e7ccef4580)
