# Require `flexEnabled` Property in Manifest (`sap-flex-enabled`)

Ensures that the `flexEnabled` property is set to `true` in the `sap.ui5` section of the manifest file for applications using UI5 versions 1.56 or higher.

## Rule Details

This rule checks if the `flexEnabled` property is defined and set to `true` in the `sap.ui5` section of the manifest file for applications using UI5 versions 1.56 or higher. This property is required to enable flexibility features in UI5 applications.

### Why was this rule introduced?

The `flexEnabled` property is essential for enabling UI adaptation in UI5 applications. Ensuring this property is correctly set helps maintain consistency and functionality across UI5 applications.

### Warning Message

The following patterns are considered wrong:

#### Incorrect Manifest File

```json
{
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.56.0"
    }
  }
}
```

The `flexEnabled` property is missing in the `sap.ui5` section.

#### Incorrect Value for `flexEnabled`

```json
{
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.56.0"
    },
    "flexEnabled": false
  }
}
```

The `flexEnabled` property is set to `false`, which is not allowed.

The following patterns are considered correct:

#### Correct Manifest File

```json
{
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.56.0"
    },
    "flexEnabled": true
  }
}
```

The `flexEnabled` property is correctly set to `true`.

## How to Fix

To fix the warning, ensure that the `flexEnabled` property is added to the `sap.ui5` section of the manifest file and set to `true`. For example:

```json
{
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.56.0"
    },
    "flexEnabled": true
  }
}
```


## Bug Report

If you encounter an issue with this rule, please open a GitHub issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation](https://ui5.sap.com/sdk/#/topic/f1430c0337534d469da3a56307ff76a)

## Release Information

