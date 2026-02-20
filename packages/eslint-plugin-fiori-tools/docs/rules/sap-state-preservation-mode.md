# Ensures Valid `statePreservationMode` Configuration in SAP Fiori Elements (`sap-state-preservation-mode`)

Validates that `statePreservationMode` is correctly configured in the `manifest.json` file for SAP Fiori Elements for OData V2 applications to ensure optimal application state handling and user experience.

**Important**: This rule validates **only SAP Fiori Elements for OData V2** applications.

## Rule Details

This rule validates the `statePreservationMode` configuration in SAP Fiori Elements for OData V2 applications. The state preservation mode determines how the object page responds to personalization changes made by the user, such as applying filters on a chart or table, displaying hidden columns, or selecting a specific tab.

### Why Was This Rule Introduced?

The `statePreservationMode` property controls how application state is preserved and restored when navigating between objects. Choosing the correct mode is critical for providing the expected user experience:

- **Applications with Flexible Column Layout (FCL)**: `persistence` mode is the default and recommended mode to properly maintain state across multiple columns and object navigation
- **Applications without FCL**: `discovery` mode is the default and recommended mode, where personalization changes apply only to the current object


### State Preservation Modes

The `statePreservationMode` property accepts the following values:

#### Discovery Mode

This is the **default mode for applications that don't use Flexible Column Layout**. In this mode, personalization changes made to the underlying controls affect only the current object. They don't affect objects at the same level.

#### Persistence Mode

This is the **default mode for applications that use Flexible Column Layout**. In this mode, changes made to the underlying controls affect the current object and objects at the same level when you navigate to another object.


### Configuration Location

The property is configured at: `sap.ui.generic.app.settings.statePreservationMode`

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "statePreservationMode": "persistence" // or "discovery"
    }
  }
}
```

## Warning Scenarios

### Invalid `statePreservationMode` Value

#### Warning Message: Invalid value "abc" for statePreservationMode. "discovery" is recommended.

The following patterns are considered warnings:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "statePreservationMode": "abc"
    }
  }
}
```


### Using `discovery` Mode with Flexible Column Layout

#### Warning Message: Consider using default. For applications using Flexible Column Layout (FCL), default is "persistence" mode.

The following patterns are considered warnings:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "flexibleColumnLayout": {
        "defaultTwoColumnLayoutType": "TwoColumnsBeginExpanded"
      },
      "statePreservationMode": "discovery"
    }
  }
}
```

The following patterns are not considered warnings:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "flexibleColumnLayout": {
        "defaultTwoColumnLayoutType": "TwoColumnsBeginExpanded"
      },
      "statePreservationMode": "persistence"
    }
  }
}
```

### Using `persistence` Mode without Flexible Column Layout

#### Warning Message: Consider using default. For applications not using Flexible Column Layout, default is "discovery" mode.

The following patterns are considered warnings:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "statePreservationMode": "persistence"
    }
  }
}
```

The following patterns are not considered warnings:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "statePreservationMode": "discovery"
    }
  }
}
```

## How to Fix

The rule provides automatic fixes for all warning scenarios:

1. **For invalid values**: The rule will replace the invalid value with the recommended mode based on FCL configuration
2. **For FCL applications using `discovery`**: The rule will change the mode to `persistence`
3. **For non-FCL applications using `persistence`**: The rule will change the mode to `discovery`

You can apply the fix automatically using your IDE's quick fix feature or by running ESLint with the `--fix` option.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAP Fiori Elements: State Preservation](https://ui5.sap.com/#/topic/b2cc3b59f7d54bc3a5fb0e4cc1d0a1f1)
- [SAP Fiori Elements: Flexible Column Layout](https://ui5.sap.com/#/topic/c4f3d41fc2d54bc3959b4dac3b78fef7)
