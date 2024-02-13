# @sap-ux/feature-toggle

This module can be used for accessing and managing feature toggles in Fiori tools.

## Installation
Npm
`npm install --save @sap-ux/feature-toggle`

Yarn
`yarn add @sap-ux/feature-toggle`

Pnpm
`pnpm add @sap-ux/feature-toggle`

## Definition of toggle

### Define in VS Code Config

#### Define boolean based toggle
the key must follow the format `sap.ux.{extensionName}`
"sap.ux.serviceModeler.testBetaFeatures.annotationWideView":
```json
"configuration": {
      "id": "sap.ux.serviceModeler",
      "type": "object",
      "properties": {
        "sap.ux.serviceModeler.testBetaFeatures.annotationWideView": {
          "type": "boolean",
          "description": "<Still in Development> - Service Modeler Annotation Wide View",
          "default": false,
          "scope": "window"
        }
      }
}
```
#### Define Token based toggle
the key must follow the format `sap.ux.{extensionName}`
"sap.ux.serviceModeler.testBetaFeatures.annotationWideView":
```json
"configuration": {
      "id": "sap.ux.applicationModeler",
      "type": "object",
      "properties": {
        "sap.ux.applicationModeler.testBetaFeatures.enableV4": {
        		  "type": [ "string", null ],
        		  "description": "<Still in Development> - Fiori tools V4 support - token required",
        		  "default": null,
        		  "scope": "window"
        		}
      }
}
```
feature id -> token is mapped in (./src/constants.ts)
```
const tokenToggleGuid: ExtensionConfigKeys = {
    'sap.ux.help.testBetaFeatures.enableAppStudioGDContribution': 'c8c52f0b-0d7d-4697-997a-d6f29814f42e',
    'sap.ux.help.testBetaFeatures.showTestGuides': 'fbb03f42-0a86-4fd5-9fc4-8c9b38a4d1a3'
} as ExtensionConfigKeys;
```


### Enable feature toggle via environment variable (note: this over-rides VS Code Config if the feature name exists in both )
Launch VS Code passing the toggles :
```shell script
TOOLSUITE_FEATURES=featureName1,FeatureName2,FeatureName3 code .
```

## Usage

Checking a feature toggle
```typescript
import { isFeatureEnabled } from '@sap/ux-feature-toggle';
const EditMode = isFeatureEnabled('sap.ux.serviceModeler.testBetaFeatures.enableEditMode'),
```

Note boolean and token based toggles both return boolean in calls to `isFeatureEnabled()`

Checking a if the internal Feature flag is set
```typescript
import { isInternalFeaturesSettingEnabled } from '@sap/ux-feature-toggle';
const isInternal = isInternalFeaturesSettingEnabled();

```
Checking a if a specific internal Feature flag is set
```typescript
import { isFeatureEnabled } from '@sap/ux-feature-toggle';
const capCdsMode = isFeatureEnabled('sap.ux.internal.testBetaFeatures.capCdsMode'),


```

## Keywords
SAP Fiori Tools