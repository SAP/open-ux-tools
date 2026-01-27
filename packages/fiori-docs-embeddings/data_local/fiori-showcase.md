
--------------------------------

**TITLE**: SAP Fiori elements for OData V4 — Feature Showcase (Developer Quick Reference)

**INTRODUCTION**: Concise, code-first reference showing how to enable and configure Fiori elements List Report, Object Page and Worklist features for CAP/OData V4 apps. Includes file paths, manifest entries, CDS annotations, XML fragments and TypeScript controller snippets used in the feature-showcase repository. Use this as copy-pasteable examples when implementing features.

**TAGS**: fiori-features, sap, cds, manifest.json, annotations, odata-v4, ui5, cap, sap-fiori

---

STEP: Project setup & run

DESCRIPTION: Install dependencies and run the local CAP + Fiori elements app. Open sandbox launchpad.

LANGUAGE: Shell

CODE:
```bash
# from repository root (see README)
npm install

# run CAP + Fiori elements (watch mode)
cds watch

# open the Fiori launchpad sandbox
# http://localhost:4008/$launchpad
```

---

STEP: Enable drafts (CDS)

DESCRIPTION: Annotate an entity to enable OData draft behavior.

LANGUAGE: CDS

CODE:
```cds
# file: any .cds annotation file (e.g. srv/<...>.cds)
annotate srv.RootEntities with @odata.draft.enabled;
```

---

STEP: Replace standard UI texts (manifest)

DESCRIPTION: Provide a custom i18n file and point to it in manifest.json under the entity page options:settings.enhanceI18n.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json
"RootEntityListReport": {
  "options": {
    "settings": {
      "enhanceI18n": "i18n/customI18N.properties"
    }
  }
}
```

LANGUAGE: Properties

CODE:
```properties
# file: app/listreport-objectpage/webapp/i18n/customI18N.properties
C_COMMON_ACTION_PARAMETER_DIALOG_CANCEL|RootEntities = Custom cancel text
```

---

STEP: Add a custom front-end action (manifest + TS extension controller)

DESCRIPTION: Define custom action metadata in manifest.json and implement handler in an extension controller. Use "press" path to controller function.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"CustomActionSection" : {
  "press": "sap.fe.showcase.lrop.ext.CustomActions.messageBox",
  "enabled": "{= ${ui>/editMode} !== 'Editable'}",
  "visible" : true,
  "text": "{i18n>CustomActionSection}"
}
```

LANGUAGE: TypeScript

CODE:
```ts
// file: app/listreport-objectpage/webapp/ext/controller/RootEntityLRExtension.controller.ts
import ControllerExtension from "sap/fe/core/ControllerExtension";
import MessageBox from "sap/m/MessageBox";
import type { ExtensionAPI } from "sap/fe/core/helpers/ExtensionAPI";
import type { ODataContextBinding, Context } from "sap/ui/model/odata/v4";

export default class RootEntityLRExtension extends ControllerExtension<ExtensionAPI> {
  messageBox() {
    MessageBox.alert("Button pressed");
  }
  enabled() {
    return true;
  }
  enabledForSingleSelect(oBindingContext: ODataContextBinding, aSelectedContexts: [Context]) {
    return !!(aSelectedContexts && aSelectedContexts.length === 1);
  }
}
```

---

STEP: Invoke CAP action from custom action (EditFlow API)

DESCRIPTION: Use EditFlow.invokeAction from extension to call server-side CAP action. Provide contexts, model, label, grouping.

LANGUAGE: TypeScript

CODE:
```ts
// file: app/listreport-objectpage/webapp/ext/controller/RootEntityOPExtension.controller.ts
import ControllerExtension from "sap/fe/core/ControllerExtension";
import type { ExtensionAPI } from "sap/fe/core/helpers/ExtensionAPI";
import type { Context, ODataModel } from "sap/ui/model/odata/v4";

export default class RootEntityOPExtension extends ControllerExtension<ExtensionAPI> {
  // Search-Term: #EditFlowAPI
  onChangeCriticality(oEvent: any /* Button$PressEvent */) {
    const sActionName = "LROPODataService.changeCriticality";
    this.base.getExtensionAPI().getEditFlow().invokeAction(sActionName, {
      contexts: oEvent.getSource().getBindingContext() as Context,
      model: oEvent.getSource().getModel() as ODataModel,
      label: 'Confirm',
      invocationGrouping: "ChangeSet"
    });
  }
}
```

---

STEP: Default sorting & advanced default filters (manifest + annotation)

DESCRIPTION: Reference a SelectionPresentationVariant (only SPV allowed) in manifest to set default filters + presentation & sort.

LANGUAGE: JSON

CODE:
```json
// file: app/worklist/webapp/manifest.json (snippet)
"OrdersList": {
  "options": {
    "settings": {
      "contextPath": "/Orders",
      "defaultTemplateAnnotationPath": "com.sap.vocabularies.UI.v1.SelectionPresentationVariant#DefaultFilter"
    }
  }
}
```

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layout.cds (example)
annotate srv.RootEntities with @(
  UI.SelectionPresentationVariant #DefaultFilter : {
    SelectionVariant : {
      $Type : 'UI.SelectionVariantType',
      SelectOptions : [ ... ]
    },
    PresentationVariant : { SortOrder: [ ... ], Visualizations: [ '@UI.LineItem' ] }
  }
);
```

---

STEP: Variant management toggle (manifest)

DESCRIPTION: Disable variant management for an entity list by setting variantManagement to "None". Update app subTitle in manifest with i18n key.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "entitySet": "RootEntities",
      "variantManagement": "None"
    }
  }
},
"sap.app": {
  "subTitle": "{{appSubTitle}}"
}
```

---

STEP: Live mode (manifest)

DESCRIPTION: Enable liveMode to apply filters immediately (no GO button).

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "liveMode": true
    }
  }
}
```

---

STEP: Define default filter values (CDS)

DESCRIPTION: Use @Common.FilterDefaultValue on properties in CDS. For complex defaults prefer SelectionPresentationVariant.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/field-control.cds (example)
annotate srv.RootEntities {
  someProperty @(Common.FilterDefaultValue : { path: '2022-01-01' });
}
```

---

STEP: Hide filters (CDS)

DESCRIPTION: Mark properties as hidden from filter bar with @UI.HiddenFilter.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/field-control.cds
annotate srv.RootEntities {
  fieldWithURLtext @UI.HiddenFilter;
};
```

---

STEP: Group filters with FilterFacets (CDS)

DESCRIPTION: Use @UI.FilterFacets and @UI.FieldGroup to structure Adapt Filters dialog.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layout.cds
annotate srv.RootEntities with @(
  UI.FilterFacets : [
    { Target : '@UI.FieldGroup#chartData', Label : '{i18n>chartData}' },
    { Target : '@UI.FieldGroup#location', Label : '{i18n>location}' }
  ]
);

annotate srv.RootEntities with @(
  UI.FieldGroup #chartData : {
    Data  : [
      { Value : integerValue },
      { Value : targetValue },
      { Value : forecastValue },
      { Value : dimensions },
      { Value : integerValue }
    ]
  }
);
```

---

STEP: Selection fields default (CDS)

DESCRIPTION: Use @UI.SelectionFields to show default filters in the filter bar.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layout.cds
annotate srv.RootEntities with @(
  UI.SelectionFields : [
    field,
    fieldWithPrice,
    criticality_code
  ]
);
```

---

STEP: Mandatory filter fields (CDS)

DESCRIPTION: Use Capabilities.FilterRestrictions.RequiredProperties to mandate filters.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/capabilities.cds
annotate srv.RootEntities with @(
  Capabilities.FilterRestrictions : {
    RequiredProperties : [ stringProperty ]
  }
);
```

---

STEP: Semantic date ranges for Date filters (CDS + manifest)

DESCRIPTION: Use FilterExpressionRestrictions to allow semantic date SingleValue/SingleRange. Optionally configure useSemanticDateRange and defaults in manifest.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layout.cds
annotate srv.RootEntities with @(
  Capabilities.FilterRestrictions : {
    FilterExpressionRestrictions : [
      { Property : 'validFrom', AllowedExpressions : 'SingleRange' }
    ]
  }
);
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (controlConfiguration snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.SelectionFields": {
          "useSemanticDateRange": true,
          "filterFields": {
            "validFrom": {
              "settings": {
                "defaultValues": [{"operator": "LASTYEARS", "values": [10]}]
              }
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Case-insensitive filtering (CDS)

DESCRIPTION: Enable tolower globally using Capabilities.FilterFunctions.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/capabilities.cds
annotate LROPODataService with @(
  Capabilities.FilterFunctions : [ 'tolower' ]
);
```

---

STEP: Value help with @Common.ValueList (CDS)

DESCRIPTION: Provide value help for property/association using @Common.ValueList with CollectionPath and Parameters.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/value-helps.cds
annotate schema.RootEntities with {
  contact @(Common : {
    Text            : contact.name,
    TextArrangement : #TextOnly,
    ValueList       : {
      Label          : '{i18n>customer}',
      CollectionPath : 'Contacts',
      Parameters     : [
        {
          $Type             : 'Common.ValueListParameterInOut',
          ValueListProperty : 'ID',
          LocalDataProperty : contact_ID
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'country_code'
        },
        {
          $Type: 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'city'
        }
      ]
    }
  });
};
```

---

STEP: Value list fixed values & radio buttons (CDS + manifest)

DESCRIPTION: Use @Common.ValueListWithFixedValues to render dropdown/radio buttons. Use ValueListShowValuesImmediately to render radio buttons. Control layout possibly configured in manifest controlConfiguration formatOptions.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/value-helps.cds
annotate schema.RootEntities with {
  criticality_code @(Common : {
    ValueListWithFixedValues,
    ValueListWithFixedValues.@Common.ValueListShowValuesImmediately,
  });
};
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.SelectionFields": {
          "radioButtonsHorizontalLayout": false,
          "filterFields": {
            "validFrom": { "settings": { "defaultValues": [{"operator": "LASTYEARS", "values": [10]}] } }
          }
        }
      }
    }
  }
}
```

---

STEP: Dependent value-help filtering (CDS)

DESCRIPTION: Use ValueListParameterIn to pass parent property as input to value help; use ValueListParameterFilterOnly or Constant for static filtering.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/value-helps.cds
annotate schema.RootEntities with{
  region @(Common : {
    Text            : region.name,
    TextArrangement : #TextFirst,
    ValueListWithFixedValues: true,
    ValueList       : {
      Label          : '{i18n>Region}',
      CollectionPath : 'Regions',
      Parameters     : [
        {
          $Type             : 'Common.ValueListParameterInOut',
          ValueListProperty : 'code',
          LocalDataProperty : region_code
        },
        {
          $Type : 'Common.ValueListParameterFilterOnly',
          ValueListProperty : 'country_code'
        },
        {
          $Type : 'Common.ValueListParameterIn',
          LocalDataProperty : country_code,
          ValueListProperty : 'country_code'
        }
      ]
    }
  });
};
```

LANGUAGE: CDS

CODE:
```cds
// static filter example with constant
annotate schema.RootEntities with {
  regionWithConstantValueHelp @(Common : {
    Text            : regionWithConstantValueHelp.name,
    TextArrangement : #TextFirst,
    ValueListWithFixedValues: true,
    ValueList       : {
      Label          : '{i18n>region}',
      CollectionPath : 'Regions',
      Parameters     : [
        {
          $Type               : 'Common.ValueListParameterInOut',
          ValueListProperty   : 'code',
          LocalDataProperty   : region_code
        },
        {
          $Type               : 'Common.ValueListParameterConstant',
          ValueListProperty   : 'country_code',
          Constant : 'DE'
        }
      ]
    }
  });
}
```

---

STEP: Multi-input dependent value help (CDS)

DESCRIPTION: For assignment entities use LocalDataProperty referencing root (root.country_code) to filter value help.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/value-helps.cds
annotate schema.AssignedRegions with {
  region @(Common : {
    Text            : region.name,
    TextArrangement : #TextFirst,
    ValueListWithFixedValues: true,
    ValueList       : {
      Label          : '{i18n>Region}',
      CollectionPath : 'Regions',
      Parameters     : [
        {
          $Type               : 'Common.ValueListParameterInOut',
          ValueListProperty   : 'code',
          LocalDataProperty   : region_code
        },
        {
          $Type               : 'Common.ValueListParameterIn',
          LocalDataProperty   : root.country_code,
          ValueListProperty   : 'country_code'
        }
      ]
    }
  });
}
```

---

STEP: Add navigation properties to filter bar (CDS + manifest)

DESCRIPTION: Add navigation-property path in @UI.SelectionFields and set navigationProperties list in manifest controlConfiguration.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layout.cds
annotate srv.RootEntities with @(
  UI.SelectionFields : [
    ...,
    childEntities1.criticalityValue_code
  ]
);
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.SelectionFields": {
          "navigationProperties": [ "childEntities1", "Order/decimalProperty" ]
        }
      }
    }
  }
}
```

---

STEP: Custom filter UI fragment + manifest + handler

DESCRIPTION: Provide XML fragment for custom filter, reference in manifest controlConfiguration filterFields template and bind to filterValues> with sap.fe filter types. Provide reset via extension API setFilterValues.

LANGUAGE: XML

CODE:
```xml
<!-- file: app/listreport-objectpage/webapp/ext/CustomFilter-Rating.fragment.xml -->
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:l="sap.ui.layout">
  <!-- Search-Term: "customFilter" -->
  <HBox alignItems="Center" core:require="{handler: 'sap/fe/showcase/lrop/ext/CustomFilter-Rating'}" width="100%">
    <RatingIndicator id="MyCustomRatingIndicatorId" maxValue="4" class="sapUiTinyMarginBegin"
      value="{path: 'filterValues>', type: 'sap.fe.macros.filter.type.Value', formatOptions: { operator: 'GE' }}" />
    <core:Icon src="sap-icon://reset" press="handler.onReset" class="sapUiSmallMarginBegin" />
  </HBox>
</core:FragmentDefinition>
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.SelectionFields": {
          "filterFields": {
            "starsValue": {
              "label": "{i18n>customFilter}",
              "property": "starsValue",
              "template": "sap.fe.showcase.lrop.ext.CustomFilter-Rating"
            }
          }
        }
      }
    }
  }
}
```

LANGUAGE: TypeScript

CODE:
```ts
// file: app/listreport-objectpage/webapp/ext/controller/RootEntityLRExtension.controller.ts
export default class RootEntityLRExtension extends ControllerExtension<ExtensionAPI> {
  onResetRating(oEvent: any /* Button$PressEvent */) {
    // clear "starsValue" filter
    this.base.getExtensionAPI().setFilterValues("starsValue");
  }
}
```

---

STEP: Custom actions in List Report header (manifest)

DESCRIPTION: Add global header actions via content.header.actions in manifest.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "content": {
        "header": {
          "actions": {
            "CustomActionLRGlobal": {
              "press": "sap.fe.showcase.lrop.ext.CustomActions.messageBox",
              "enabled": "sap.fe.showcase.lrop.ext.CustomActions.enabled",
              "visible": true,
              "text": "{i18n>CustomActionLRGlobal}"
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Table actions — bound, inline, unbound and annotation usage (CDS)

DESCRIPTION: Add UI.DataFieldForAction entries to @UI.LineItem to display actions. For inline show Icon or set Inline:true. For unbound actions refer via EntityContainer path.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layouts_RootEntities.cds (snippet)
annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForAction',
      Action : 'LROPODataService.changeCriticality',
      Label : '{i18n>changeCriticality}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action : 'LROPODataService.changeProgress',
      Label : '{i18n>changeProgess}',
      IconUrl : 'sap-icon://status-critical',
      Inline : true
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action : 'LROPODataService.EntityContainer/unboundAction',
      Label : '{i18n>unboundAction}'
    }
  ]
);
```

---

STEP: Enable/disable actions dynamically with Core.OperationAvailable (CDS)

DESCRIPTION: Use @Core.OperationAvailable with $edmJson path to enable/disable actions dynamically.

LANGUAGE: CDS

CODE:
```cds
// inside service actions definition
@Core.OperationAvailable: {$edmJson: {$Path: '/Singleton/enabled'}}
action unboundAction(@(title : '{i18n>inputValue}') input : String);
```

LANGUAGE: CDS

CODE:
```cds
// bound action example (relative)
@(
  Core.OperationAvailable: ($self.integerValue > 0)
)
action changeProgress ( ... );
```

---

STEP: Side effects for actions (CDS)

DESCRIPTION: Annotate action with Common.SideEffects and list TargetProperties using OData binding path (in/..).

LANGUAGE: CDS

CODE:
```cds
// file: srv/list-report-srv.cds (service actions snippet)
entity RootEntities as select from persistence.RootEntities actions {
  @(
    Common.SideEffects : { TargetProperties : ['in/integerValue'] }
  )
  action changeProgress (@(title : '{i18n>newProgress}', UI.ParameterDefaultValue : 50) newProgress : Integer);
};
```

---

STEP: Value help for action parameters (CDS)

DESCRIPTION: Annotate action parameter inline with Common.ValueList to provide value help.

LANGUAGE: CDS

CODE:
```cds
entity RootEntities as select from persistence.RootEntities actions {
  action changeCriticality (
    @(
      title : '{i18n>newCriticality}',
      UI.ParameterDefaultValue : 0,
      Common : {
        ValueListWithFixedValues : true,
        ValueList : {
          Label          : '{i18n>Criticality}',
          CollectionPath : 'Criticality',
          Parameters     : [
            {
              $Type             : 'Common.ValueListParameterInOut',
              ValueListProperty : 'code',
              LocalDataProperty : newCriticality
            },
            {
              $Type             : 'Common.ValueListParameterDisplayOnly',
              ValueListProperty : 'name'
            }
          ]
        }
      }
    )
    newCriticality : Integer
  );
};
```

---

STEP: Default parameter values for actions (CDS)

DESCRIPTION: Add UI.ParameterDefaultValue annotation inline on action parameter.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with {
  action changeProgress (@(title : '{i18n>newProgress}', UI.ParameterDefaultValue : 50) newProgress : Integer);
};
```

---

STEP: Group actions into dropdown menu (manifest)

DESCRIPTION: Use controlConfiguration under LineItem actions.MenuActions to define menu with identifiers referencing DataFieldForAction.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.LineItem": {
          "actions": {
            "MenuActions": {
              "text": "{i18n>MenuButton}",
              "menu": [
                "DataFieldForAction::LROPODataService.changeCriticality",
                "DataFieldForAction::LROPODataService.EntityContainer::unboundAction"
              ]
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Dynamic CRUD restrictions and Singleton-based evaluation (CDS)

DESCRIPTION: Use Capabilities.DeleteRestrictions, UI.UpdateHidden, UI.CreateHidden using fields or singleton paths with $edmJson path support.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/capabilities.cds
annotate srv.RootEntities with @(
  Capabilities.DeleteRestrictions : {
    Deletable : deletePossible
  },
  UI.UpdateHidden : updateHidden,
  UI.CreateHidden: { $edmJson: { $Path: '/Singleton/createHidden' } }
);
```

---

STEP: Navigation button in line item (intent-based navigation) (CDS)

DESCRIPTION: Add UI.DataFieldForIntentBasedNavigation to LineItem with SemanticObject, Action, Mapping and RequiresContext.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layouts_RootEntities.cds
annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForIntentBasedNavigation',
      Label : '{i18n>inboundNavigation}',
      SemanticObject : 'FeatureShowcaseOrder',
      Action : 'manage',
      RequiresContext : true,
      Inline : true,
      IconUrl : 'sap-icon://cart',
      Mapping : [
        {
          $Type : 'Common.SemanticObjectMappingType',
          LocalProperty : integerValue,
          SemanticObjectProperty : 'integerProperty'
        }
      ],
      @UI.Importance : #High
    }
  ]
);
```

LANGUAGE: JSON

CODE:
```json
// file: app/worklist/webapp/manifest.json (application crossNavigation inbound)
"sap.app": {
  "crossNavigation": {
    "inbounds": {
      "feature-showcase-worklist": {
        "signature": { "parameters": {}, "additionalParameters": "allowed" },
        "semanticObject": "FeatureShowcaseOrder",
        "action": "manage",
        "title": "Work List",
        "subTitle": "Manage"
      }
    }
  }
}
```

---

STEP: Critical actions (CDS)

DESCRIPTION: Mark action critical using Common.IsActionCritical to show confirm popover.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layouts_RootEntities.cds
annotate srv.criticalAction with @(
  Common.IsActionCritical : true
);
```

---

STEP: Message Toasts from CAP (Node.js)

DESCRIPTION: Use req.notify from CAP to send messages with severity 1 (toast) and higher severities produce dialogs.

LANGUAGE: JavaScript

CODE:
```js
// file: srv/list-report-srv.js (CAP handler)
module.exports = (srv) => {
  srv.on('someAction', async (req) => {
    // notify a toast
    req.notify(`Critical action pressed`);
  });
};
```

---

STEP: Add custom table action via manifest controlConfiguration (manifest)

DESCRIPTION: Define custom actions for the table toolbar using controlConfiguration referencing the LineItem table settings.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.LineItem": {
          "actions": {
            "CustomActionLR" : {
              "press": "sap.fe.showcase.lrop.ext.CustomActions.messageBox",
              "enabled": "sap.fe.showcase.lrop.ext.CustomActions.enabledForSingleSelect",
              "visible" : true,
              "text": "{i18n>CustomActionLR}"
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Set table type (Responsive/Grid/Analytical/Tree) (manifest)

DESCRIPTION: Configure table type for specific LineItem annotation via controlConfiguration.tableSettings.type. Recommended to use SAP Fiori tools Application Modeler.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.LineItem": {
          "tableSettings": {
            "type": "ResponsiveTable"
          }
        }
      }
    }
  }
}
```

---

STEP: Enable TreeTable with recursive hierarchy (manifest + CDS + extend)

DESCRIPTION: Configure TreeTable in manifest with hierarchyQualifier matching @Aggregation.RecursiveHierarchy qualifier. Extend service entity with additional Hierarchy.RecursiveHierarchy and helper columns required by Fiori (LimitedDescendantCount, DistanceFromRoot, DrillState, LimitedRank). Optionally specify Hierarchy.RecursiveHierarchyActions and creationMode.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "/OrganizationalUnits/@com.sap.vocabularies.UI.v1.LineItem": {
          "tableSettings": {
            "type": "TreeTable",
            "hierarchyQualifier": "OrgUnitsHierarchy"
          }
        }
      }
    }
  }
}
```

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layouts_OrganizationalUnits.cds
annotate srv.OrganizationalUnits @Aggregation.RecursiveHierarchy #OrgUnitsHierarchy : {
  ParentNavigationProperty : superOrdinateOrgUnit,
  NodeProperty             : ID
};
```

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layouts_OrganizationalUnits.cds
extend srv.OrganizationalUnits with @(
  Hierarchy.RecursiveHierarchy #OrgUnitsHierarchy : {
    LimitedDescendantCount : LimitedDescendantCount,
    DistanceFromRoot       : DistanceFromRoot,
    DrillState             : DrillState,
    LimitedRank            : LimitedRank
  },
  Capabilities.FilterRestrictions.NonFilterableProperties: [
    'LimitedDescendantCount','DistanceFromRoot','DrillState','LimitedRank'
  ],
  Capabilities.SortRestrictions.NonSortableProperties    : [
    'LimitedDescendantCount','DistanceFromRoot','DrillState','LimitedRank'
  ],
) columns {
  null as LimitedDescendantCount : Int16;
  null as DistanceFromRoot       : Int16;
  null as DrillState             : String;
  null as LimitedRank            : Int16;
};
```

LANGUAGE: CDS

CODE:
```cds
// add optional recursive hierarchy actions
annotate srv.OrganizationalUnits @(
  Hierarchy.RecursiveHierarchyActions #OrgUnitsHierarchy : {
    ChangeSiblingForRootsSupported,
    ChangeNextSiblingAction : 'LROPODataService.moveOrgUnit',
    CopyAction : 'LROPODataService.copyOrgUnit'
  }
);
```

LANGUAGE: TypeScript

CODE:
```ts
// extension hook example for create enablement in TreeTable
export default class RootEntityLRExtension extends ControllerExtension<ExtensionAPI> {
  isCreateEnabled(value: String, parentContext?: Context) {
    switch (parentContext?.getProperty("category_code")) {
      case "03": return value === "02"; // Only Divisions under Business Units
      case "02": return value === "01"; // Only Departments under Divisions
      case "01": return false;           // Nothing under Departments
      default:   return value === "03";  // Only Business Units at root
    }
  }
}
```

---

STEP: Multiple views — Single table quickVariantSelection (manifest)

DESCRIPTION: Use quickVariantSelection.tableSettings to present multiple variant selection items in same table. Use annotationPath to selection variants.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.LineItem": {
          "tableSettings": {
            "quickVariantSelection": {
              "paths": [
                { "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant1" },
                { "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant2" }
              ],
              "hideTableTitle": false,
              "showCounts": true
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Multiple table views (manifest)

DESCRIPTION: Use views.paths array to define multiple tabs with annotationPath referring to SelectionVariant or SelectionPresentationVariant and optionally entitySet.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "views": {
        "paths": [
          { "key": "tab1", "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant1" },
          { "key": "tab2", "annotationPath": "com.sap.vocabularies.UI.v1.SelectionPresentationVariant#SelectionPresentationVariant" },
          { "key": "tab3", "entitySet": "OrganizationalUnits", "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#activeOrgUnits" }
        ],
        "showCounts": false
      }
    }
  }
}
```

---

STEP: SelectionVariant (CDS)

DESCRIPTION: Define selection filters (SelectOptions/Ranges) using UI.SelectionVariant with qualifier.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layouts_RootEntities.cds
annotate srv.RootEntities with @(
  UI.SelectionVariant #variant1 : {
    Text : '{i18n>SVariant1}',
    SelectOptions : [
      {
        PropertyName : criticality_code,
        Ranges : [
          { Sign : #I, High : 2, Option : #BT, Low : 0 }
        ]
      }
    ]
  }
);
```

---

STEP: SelectionPresentationVariant (CDS)

DESCRIPTION: Combine selection variant & presentation variant (SortOrder, Visualizations) in one annotated block.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layouts_RootEntities.cds
annotate srv.RootEntities with @(
  UI.SelectionPresentationVariant #SelectionPresentationVariant : {
    Text : '{i18n>SelectionPresentationVariant}',
    SelectionVariant : {
      $Type : 'UI.SelectionVariantType',
      SelectOptions : [
        {
          PropertyName : criticality_code,
          Ranges : [ { Sign : #I, Option : #GT, Low : 0 } ]
        }
      ]
    },
    PresentationVariant : {
      SortOrder : [ { Property : fieldWithPrice, Descending : false } ],
      Visualizations : [ '@UI.LineItem#simplified' ]
    }
  }
);
```

---

STEP: Creation dialog is triggered by @Core.Immutable fields (CDS)

DESCRIPTION: Mark properties required at creation time using @Core.Immutable so they appear in creation dialog.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities {
  stringProperty @Core.Immutable;
};
```

---

STEP: Default sort order (CDS)

DESCRIPTION: Use UI.PresentationVariant.SortOrder to set default sorting for list/table.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.PresentationVariant : {
    SortOrder : [ { Property : field, Descending : false } ],
    Visualizations : [ '@UI.LineItem' ]
  }
);
```

---

STEP: Table multi-selection (manifest)

DESCRIPTION: Set selectionMode in controlConfiguration.tableSettings to "Multi".

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.LineItem": {
          "tableSettings": {
            "type": "ResponsiveTable",
            "selectionMode": "Multi"
          }
        }
      }
    }
  }
}
```

---

STEP: Semantic key fields (CDS)

DESCRIPTION: Define Common.SemanticKey array to highlight fields as semantic keys.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  Common.SemanticKey : [ field ]
);
```

---

STEP: Highlight line items by criticality (CDS)

DESCRIPTION: Use UI.Criticality in UI.LineItem to highlight rows.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.LineItem.@UI.Criticality : criticality_code
);
```

---

STEP: Rating indicator and progress indicator in LineItem (CDS)

DESCRIPTION: Define UI.DataPoint with Visualization #Rating or #Progress and reference via UI.DataFieldForAnnotation in UI.LineItem.

LANGUAGE: CDS

CODE:
```cds
// Rating
annotate srv.RootEntities with @(
  UI.DataPoint #ratingIndicator : {
    Value : starsValue,
    TargetValue : 4,
    Visualization : #Rating,
    Title : '{i18n>ratingIndicator}',
    @Common.QuickInfo : 'Tooltip via Common.QuickInfo'
  }
);

annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Label : '{i18n>ratingIndicator}',
      Target : '@UI.DataPoint#ratingIndicator',
      @UI.Importance : #Low
    }
  ]
);

// Progress
annotate srv.RootEntities with @(
  UI.DataPoint #progressIndicator : {
    Value : integerValue,
    TargetValue : 100,
    Visualization : #Progress,
    Title : '{i18n>progressIndicator}'
  }
);

annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Label : '{i18n>progressIndicator}',
      Target : '@UI.DataPoint#progressIndicator',
      @UI.Importance : #Low
    }
  ]
);
```

---

STEP: Tooltip on table field using DataPoint and Common.QuickInfo (CDS)

DESCRIPTION: Define UI.DataPoint with Common.QuickInfo and reference via UI.DataFieldForAnnotation.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.DataPoint #fieldWithTooltip : {
    Value : dimensions,
    @Common.QuickInfo : '{i18n>Tooltip}'
  }
);

annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target : '@UI.DataPoint#fieldWithTooltip',
      Label : '{i18n>fieldWithToolTip}'
    }
  ]
);
```

---

STEP: Add Smart Micro Chart to table (CDS)

DESCRIPTION: Define UI.DataPoint for chart, UI.Chart referencing DataPoint in MeasureAttributes, then reference chart in UI.LineItem as DataFieldForAnnotation.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.DataPoint #radialChart : { Value : integerValue, TargetValue : targetValue, Criticality : criticality_code }
);

annotate srv.RootEntities with @(
  UI.Chart #radialChart : {
    Title : '{i18n>radialChart}',
    Description : '{i18n>ThisIsAMicroChart}',
    ChartType : #Donut,
    Measures : [ integerValue ],
    MeasureAttributes : [{
      $Type : 'UI.ChartMeasureAttributeType',
      Measure : integerValue,
      Role : #Axis1,
      DataPoint : '@UI.DataPoint#radialChart'
    }]
  }
);

annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target : '@UI.Chart#radialChart',
      Label : '{i18n>radialChart}'
    }
  ]
);
```

---

STEP: Contact Quick View setup (CDS)

DESCRIPTION: Annotate contact entity using Communication.Contact and add DataFieldForAnnotation referencing contact/@Communication.Contact in parent LineItem.

LANGUAGE: CDS

CODE:
```cds
// Contact annotation
annotate srv.Contacts with @(
  Communication.Contact : {
    fn   : name,
    kind : #org,
    tel  : [{ uri : phone, type : #preferred }],
    adr  : [{ building : building, country : country.name, street : street, locality : city, code : postCode, type : #preferred }]
  }
);

// Reference in RootEntities line item
annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target : 'contact/@Communication.Contact',
      Label : '{i18n>contactQuickView}'
    }
  ]
);
```

---

STEP: Quick View Facet (CDS)

DESCRIPTION: Create UI.FieldGroup, UI.HeaderInfo and UI.QuickViewFacets on association entity. Add DataField showing the association ID in LineItem.

LANGUAGE: CDS

CODE:
```cds
annotate srv.Orders with @(
  UI.FieldGroup #data : {
    Label : '{i18n>Order}',
    Data : [ { Value : field2 }, { Value : integerProperty }, { Value : field4 } ]
  }
);

annotate srv.Orders with @(
  UI.HeaderInfo : {
    TypeName : '{i18n>Order}',
    TypeNamePlural : '{i18n>Order.typeNamePlural}',
    Title  : { $Type : 'UI.DataField', Value : '{i18n>Order}' },
    Description : { $Type : 'UI.DataField', Value : field },
    ImageUrl : '',
    TypeImageUrl : 'sap-icon://blank-tag'
  }
);

annotate srv.Orders with @(
  UI.QuickViewFacets : [
    { $Type : 'UI.ReferenceFacet', Target : '@UI.FieldGroup#data' }
  ]
);

// Use association in RootEntities line item to show quick view
annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataField',
      Value : association2one_ID,
      Label : '{i18n>Order}',
      @UI.Importance : #High
    }
  ]
);

// optionally annotate association for semantic object links
association2one @Common.SemanticObject : 'FeatureShowcaseOrder';
```

LANGUAGE: JSON

CODE:
```json
// file: app/worklist/webapp/manifest.json (crossNavigation inbound)
"sap.app": {
  "crossNavigation": {
    "inbounds": {
      "feature-showcase-worklist": {
        "semanticObject": "FeatureShowcaseOrder",
        "action": "manage",
        "title": "Work List",
        "subTitle": "Manage"
      }
    }
  }
}
```

---

STEP: Multiple fields per responsive column (CDS)

DESCRIPTION: Create UI.FieldGroup with multiple Data entries and add it to UI.LineItem via DataFieldForAnnotation.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.FieldGroup #AdminData : {
    Data : [
      { Value : createdAt },
      { Value : createdBy },
      { Value : modifiedAt },
      { Value : modifiedBy }
    ]
  },
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForAnnotation',
      Target : '@UI.FieldGroup#AdminData',
      Label : '{i18n>adminData}',
      @UI.Importance : #High
    }
  ]
);
```

---

STEP: Add image column to table (CDS)

DESCRIPTION: Add DataField with property annotated @UI.IsImageURL.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/labels.cds
annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataField',
      Value : imageUrl,
      @UI.Importance : #High
    }
  ]
);

annotate srv.RootEntities {
  imageUrl @UI.IsImageURL;
}
```

---

STEP: Units and Currency (CDS)

DESCRIPTION: Use @Measures.Unit for UoM or @Measures.ISOCurrency for currencies. For custom unit scale use @CodeList.UnitsOfMeasure and @Common.UnitSpecificScale.

LANGUAGE: CDS

CODE:
```cds
// labeling value's unit
annotate srv.RootEntities with {
  integerValueWithUoM @Measures.Unit : uom_code;
}

// customize units of measure code list and scale
@CodeList.UnitsOfMeasure : {
  Url : './$metadata',
  CollectionPath : 'UnitOfMeasures'
}
service LROPODataService @(path : '/srv1') {
  entity UnitOfMeasures as projection on persistence.UnitOfMeasures;
}

entity sap.common.UnitOfMeasures : CodeList {
  key code  : String(30) @Common.Text : descr @Common.UnitSpecificScale : scale @CodeList.ExternalCode : name;
  scale: Integer;
};
```

---

STEP: Add HTTP link column (CDS)

DESCRIPTION: Use UI.DataFieldWithUrl with Value (visible) and Url (target). Optionally set HTML5.LinkTarget.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldWithUrl',
      Url : fieldWithURL,
      Value : fieldWithURLtext,
      Label : '{i18n>dataFieldWithURL}',
      @UI.Importance : #Medium
    }
  ]
);

annotate srv.RootEntities {
  fieldWithURLtext @HTML5.LinkTarget : '_blank';
}
```

---

STEP: Add custom column via extension (XML fragment + manifest)

DESCRIPTION: Create XML fragment for the column template and reference it in manifest controlConfiguration.@com.sap.vocabularies.UI.v1.LineItem.columns with key, header, template, properties and position.

LANGUAGE: XML

CODE:
```xml
<!-- file: app/listreport-objectpage/webapp/ext/CustomColumn-DateRangeLR.fragment.xml -->
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m">
  <Label text="{validFrom} - {validTo}"/>
</core:FragmentDefinition>
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.LineItem": {
          "columns": {
            "CustomColumn": {
              "key": "customColumnLR",
              "header": "{i18n>validityPeriodLR}",
              "template": "sap.fe.showcase.lrop.ext.CustomColumn-DateRangeLR",
              "availability": "Adaptation",
              "horizontalAlign": "Center",
              "width": "auto",
              "properties": ["validFrom","validTo"],
              "position": { "placement": "After", "anchor": "DataField::fieldWithCriticality" }
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Object Page — Communication properties, time/date, multiline & placeholder (CDS + manifest)

DESCRIPTION: Annotate communication fields for email/phone, use Date/Time types, annotate with @UI.MultiLineText and configure multiline formatOptions in manifest; use @UI.Placeholder for edit placeholders.

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/labels.cds
annotate schema.RootEntities with {
  email     @title : '{i18n>email}'     @Communication.IsEmailAddress;
  telephone @title : '{i18n>telephone}' @Communication.IsPhoneNumber;

  description @title : '{i18n>description}' @UI.MultiLineText;

  region @title : '{i18n>region}' @UI.Placeholder : 'Select a region';
};
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (controlConfiguration snippet)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.FieldGroup#Section": {
          "fields": {
            "DataField::description": {
              "formatOptions": {
                "textLinesDisplay": 1,
                "textLinesEdit": 3
              }
            },
            "DataField::description_customGrowing": {
              "formatOptions": {
                "textMaxLines": "5",
                "textMaxCharactersDisplay": 400,
                "textExpandBehaviorDisplay" : "Popover"
              }
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Object Page anchorBarVisible & header visibility (manifest)

DESCRIPTION: Toggle header and anchor bar visibility for OP via options.settings.content.header in manifest.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "content": {
        "header": {
          "anchorBarVisible": true,
          "visible": true
        }
      }
    }
  }
}
```

---

STEP: Object Page HeaderInfo & dynamic title (CDS)

DESCRIPTION: Configure @UI.HeaderInfo to set title, description, image. Use OData concat expressions for dynamic header Description/Title.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.HeaderInfo : {
    TypeName : '{i18n>RootEntities}',
    TypeNamePlural : '{i18n>RootEntities.typeNamePlural}',
    Title : { $Type : 'UI.DataField', Value : field },
    Description : { $Type : 'UI.DataField', Value : '{i18n>RootEntities}' },
    ImageUrl : imageUrl,
    TypeImageUrl : 'sap-icon://sales-order'
  }
);

// Dynamic description using odata.concat and inline $If
annotate service.ChildEntities1 with @(
  UI.HeaderInfo : {
    Description : {
      Value : ('Using odata.concat - Field: ' || field)
    }
  }
);

annotate service.ChildEntities1 with @(
  UI.HeaderInfo : {
    Description : {
      Value : ('Using odata.concat - Field: ' || (field = 'child entity 1' ? field : 'Other child entities'))
    }
  }
);
```

---

STEP: Header facets & field groups (CDS)

DESCRIPTION: Add UI.HeaderFacets referencing UI.FieldGroup and UI.DataPoints/Reference facets for header content.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.FieldGroup #HeaderData : {
    Data : [
      { Value : field },
      { Value : fieldWithCriticality, Criticality : criticality_code },
      { Value : fieldWithUoM },
      { Value : association2one_ID },
      {
        $Type : 'UI.DataFieldForAnnotation',
        Target : 'contact/@Communication.Contact',
        Label : '{i18n>contact}'
      }
    ]
  }
);

annotate srv.RootEntities with @(
  UI.HeaderFacets : [
    { $Type : 'UI.ReferenceFacet', Target : '@UI.FieldGroup#HeaderData', Label : '{i18n>HeaderData}' }
  ]
);
```

---

STEP: Custom header facet via manifest (manifest + fragment)

DESCRIPTION: Create XML fragment for header facet, reference it in manifest under content.header.facets with template/templateEdit, stashed, position.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"childEntities1ObjectPage": {
  "options": {
    "settings": {
      "content": {
        "header": {
          "facets": {
            "CustomHeaderFacet": {
              "template": "sap.fe.showcase.lrop.ext.CustomHeaderFacet-ProcessFlow",
              "templateEdit" : "sap.fe.showcase.lrop.ext.CustomHeaderFacet-Edit",
              "stashed": false,
              "title": "{i18n>customHeaderFacet}",
              "position": { "placement": "After", "anchor": "FacetWithPercent" },
              "flexSettings": { "designtime": "not-adaptable-visibility" }
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Header facet in-page navigation (manifest + CDS)

DESCRIPTION: Configure controlConfiguration navigation targetSections to jump to section/subsection using anchor IDs. Define target section/subsection facets in UI.Facets (IDs required).

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.DataPoint#progressIndicator": {
          "navigation": {
            "targetSections": {
              "sectionId": "sap.fe.showcase.lrop::RootEntityObjectReport--fe::FacetSection::chartData",
              "subSectionId": "sap.fe.showcase.lrop::RootEntityObjectReport--fe::FacetSubSection::advancedChartData"
            }
          }
        }
      }
    }
  }
}
```

LANGUAGE: CDS

CODE:
```cds
// file: app/listreport-objectpage/layout.cds
annotate srv.RootEntities with @(
  UI.Facets : [
    {
      $Type : 'UI.CollectionFacet',
      Label : '{i18n>chartData}',
      ID  : 'chartDataCollection',
      Facets : [
        {
          $Type : 'UI.ReferenceFacet',
          Target : '@UI.FieldGroup#advancedChartData',
          ID : 'advancedChartData'
        }
      ]
    }
  ]
);
```

---

STEP: Header facet external navigation (manifest)

DESCRIPTION: Add outbound in sap.app crossNavigation.outbounds and reference outbound in controlConfiguration targetOutbound.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (sap.app snippet)
"sap.app": {
  "crossNavigation": {
    "outbounds": {
      "ExternalNavigation": {
        "semanticObject": "FeatureShowcaseOrder",
        "action": "manage"
      }
    }
  }
}

// reference in controlConfiguration
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.DataPoint#ratingIndicator": {
          "navigation": {
            "targetOutbound": {
              "outbound": "ExternalNavigation"
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Toggle header editability (manifest)

DESCRIPTION: Set editableHeaderContent false to make header read-only even in edit mode.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "editableHeaderContent": false
    }
  }
}
```

---

STEP: Add subpage (manifest routing + target + navigation)

DESCRIPTION: Add route pattern and target entry for sub entity Object Page and add navigation entry in options.settings.navigation.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (routing routes)
"routes": [
  {
    "pattern": "RootEntities({key})/ChildEntities1({key2}):?query:",
    "name": "childEntities1ObjectPage",
    "target": "childEntities1ObjectPage"
  }
]

// file: app/listreport-objectpage/webapp/manifest.json (targets)
"targets": {
  "childEntities1ObjectPage": {
    "type": "Component",
    "id": "childEntities1ObjectPage",
    "name": "sap.fe.templates.ObjectPage",
    "options": {
      "settings": {
        "entitySet": "ChildEntities1"
      }
    }
  }
}

// file: app/listreport-objectpage/webapp/manifest.json (entity navigation)
"RootEntityListReport": {
  "options": {
    "settings": {
      "navigation": {
        "childEntities1": {
          "detail": { "route": "childEntities1ObjectPage" }
        }
      }
    }
  }
}
```

---

STEP: Show related apps button (manifest)

DESCRIPTION: Enable showRelatedApps true to show Related Apps button in header action row for same semantic object.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "showRelatedApps": true
    }
  }
}
```

---

STEP: Side content toggle (manifest + extension API)

DESCRIPTION: Define side content fragment in manifest under content.body.sections[].sideContent and toggle from extension using ExtensionAPI.showSideContent(key).

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "content": {
        "body": {
          "sections": {
            "customSectionQualifier": {
              "sideContent": {
                "template": "sap.fe.showcase.lrop.ext.SideContent",
                "equalSplit": true
              }
            },
            "childEntities1Section": {
              "sideContent": { "template": "sap.fe.showcase.lrop.ext.SideContent" }
            }
          }
        }
      }
    }
  }
}
```

LANGUAGE: TypeScript

CODE:
```ts
// file: app/listreport-objectpage/webapp/ext/controller/RootEntityOPExtension.controller.ts
export default class RootEntityOPExtension extends ControllerExtension<ExtensionAPI> {
  toggleSideContent(oBindingContext: any /* ODataContextBinding */) {
    this.base.getExtensionAPI().showSideContent("customSectionQualifier");
  }
  toggleSideContentItem1(oContextInfo: any /* ODataContextBinding */) {
    this.base.getExtensionAPI().showSideContent("childEntities1Section");
  }
}
```

---

STEP: Forms — FieldGroup, ConnectedFields, Form custom content (CDS + manifest)

DESCRIPTION: Build forms using @UI.FieldGroup and include connected fields using @UI.ConnectedFields. Add custom form fields via XML fragments referenced in manifest controlConfiguration for the field group.

LANGUAGE: CDS

CODE:
```cds
// Field group definition
annotate srv.RootEntities with @(
  UI.FieldGroup #ShowWhenInEdit : {
    Data : [
      { Value : field },
      { Value : fieldWithCriticality },
      { Value : fieldWithUoM },
      { Value : fieldWithPrice },
      { Value : criticality_code },
      { Value : contact_ID },
      { Value : association2one_ID }
    ]
  }
);

// Connected fields
UI.ConnectedFields #ConnectedDates : {
  Label : '{i18n>ConnectedField}',
  Template : '{integerValue} / {targetValue}',
  Data : {
    integerValue : { $Type : 'UI.DataField', Value : integerValue },
    targetValue  : { $Type : 'UI.DataField', Value : targetValue }
  }
};

annotate srv.RootEntities with @(
  UI.FieldGroup #Section : {
    Data : [
      {
        $Type : 'UI.DataFieldForAnnotation',
        Target : '@UI.ConnectedFields#ConnectedDates'
      }
    ]
  }
);
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (custom form field snippet)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.FieldGroup#timeAndDate": {
          "fields": {
            "CustomContentFieldGroup": {
              "label": "{i18n>validityPeriodOP}",
              "template": "sap.fe.showcase.lrop.ext.CustomField-DatePicker",
              "position": { "placement": "Before", "anchor": "DataField::validTo" }
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Form actions and inline actions (CDS + manifest)

DESCRIPTION: Add DataFieldForAction or DataFieldForIntentBasedNavigation inside FieldGroup Data array to display section-level actions or inline form toolbar actions (use Inline:true).

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.FieldGroup #Section : {
    Data : [
      {
        $Type : 'UI.DataFieldForIntentBasedNavigation',
        Label : '{i18n>inboundNavigation}',
        SemanticObject : 'FeatureShowcaseOrder',
        Action : 'manage',
        RequiresContext : true,
        IconUrl : 'sap-icon://cart',
        Mapping : [
          {
            $Type : 'Common.SemanticObjectMappingType',
            LocalProperty : integerValue,
            SemanticObjectProperty : 'integerProperty'
          }
        ],
        @UI.Importance : #High
      },
      {
        $Type : 'UI.DataFieldForAction',
        Action : 'LROPODataService.EntityContainer/unboundAction',
        Label : '{i18n>formActionEmphasized}',
        @UI.Emphasized : true
      },
      {
        $Type : 'UI.DataFieldForAction',
        Action : 'LROPODataService.changeProgress',
        Label : '{i18n>formAction}',
        Inline : true
      }
    ]
  }
);
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (inline form action)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.FieldGroup#Section": {
          "actions" : {
            "CustomActionForm" : {
              "press": "sap.fe.showcase.lrop.ext.CustomActions.messageBox",
              "enabled": true,
              "visible" : true,
              "inline" : true,
              "text": "{i18n>CustomActionOPFooter}"
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Object Page tables — LineItem reference facet + enable personalization, variant, full screen, inline creation (CDS + manifest)

DESCRIPTION: Add child entity @UI.LineItem then reference via ReferenceFacet in root UI.Facets. Use manifest controlConfiguration to enable variantManagement, personalization, enableFullScreen, creationMode, enableExport, quickVariantSelection, etc.

LANGUAGE: CDS

CODE:
```cds
// LineItem for child entity
annotate srv.ChildEntities3 with @(
  UI.LineItem : [
    { Value : field }
  ]
);

// Reference in RootEntities facets
annotate srv.RootEntities with @(
  UI.Facets : [
    {
      $Type : 'UI.ReferenceFacet',
      Target : 'childEntities3/@UI.LineItem',
      Label : '{i18n>childEntities3}'
    }
  ]
);
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (table options)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "variantManagement": "Control",
      "controlConfiguration": {
        "childEntities1/@com.sap.vocabularies.UI.v1.LineItem": {
          "tableSettings": {
            "personalization": { "column": true, "sort": false, "filter": true },
            "enableFullScreen": true,
            "creationMode": { "name": "Inline", "createAtEnd": true },
            "enableExport": true,
            "quickVariantSelection": {
              "paths": [
                { "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant1" }
              ],
              "showCounts": true
            },
            "actions": {
              "CustomActionOPTableToolbar" : {
                "press": "sap.fe.showcase.lrop.ext.CustomActions.messageBox",
                "enabled": "{= %{deletePossible} === true}",
                "visible" : true,
                "text": "{i18n>CustomActionOPTableToolbar (enabled when delete enabled)}"
              }
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Charts in Object Page sections (CDS)

DESCRIPTION: Prepare entity with @Aggregation.ApplySupported and Analytics.AggregatedProperties, provide UI.Chart using aggregation method names (Measures = aggregated names) and reference as a ReferenceFacet in UI.Facets.

LANGUAGE: CDS

CODE:
```cds
// Aggregation support
annotate srv.ChartDataEntities with @(
  Aggregation.ApplySupported : {
    GroupableProperties : [ dimensions, criticality_code ],
    AggregatableProperties : [ { Property : integerValue } ]
  }
);

// Define aggregated measures
annotate service.ChartDataEntities with @(
  Analytics.AggregatedProperties : [
    { Name : 'minAmount', AggregationMethod : 'min', AggregatableProperty : 'integerValue', @Common.Label : 'Minimal Net Amount' },
    { Name : 'maxAmount', AggregationMethod : 'max', AggregatableProperty : 'integerValue', @Common.Label : 'Maximal Net Amount' },
    { Name : 'avgAmount', AggregationMethod : 'average', AggregatableProperty : 'integerValue', @Common.Label : 'Average Net Amount' }
  ]
);

// UI.Chart referencing aggregated measure
annotate service.ChartDataEntities with @(
  UI.Chart : {
    Title : '{i18n>chart}',
    ChartType : #Column,
    Measures : [ maxAmount ],
    Dimensions : [ dimensions ],
    MeasureAttributes : [{
      $Type : 'UI.ChartMeasureAttributeType',
      Measure : maxAmount,
      Role : #Axis1
    }],
    DimensionAttributes : [
      { $Type : 'UI.ChartDimensionAttributeType', Dimension : dimensions, Role : #Category },
      { $Type : 'UI.ChartDimensionAttributeType', Dimension : criticality_code, Role : #Category }
    ],
    Actions : [
      {
        $Type : 'UI.DataFieldForAction',
        Action : 'LROPODataService.EntityContainer/unboundAction',
        Label : '{i18n>unboundAction}'
      }
    ]
  }
);

// Reference chart as facet
annotate srv.RootEntities with @(
  UI.Facets : [
    { $Type : 'UI.ReferenceFacet', Target : 'chartEntities/@UI.Chart', Label : '{i18n>chart}' }
  ]
);
```

LANGUAGE: CDS

CODE:
```cds
// Semantic coloring for dimension via UI.ValueCriticality
annotate srv.ChartDataEntities with {
  criticality @(
    UI.ValueCriticality : [
      { Value : 0, Criticality : #Neutral },
      { Value : 1, Criticality : #Negative },
      { Value : 2, Criticality : #Critical },
      { Value : 3, Criticality : #Positive }
    ]
  );
};
```

---

STEP: Custom sections & subsections (manifest)

DESCRIPTION: Add custom XML fragment section/subsection templates to content.body.sections and content.body.sections[].subSections with unique IDs, position and title.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (custom section)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "content": {
        "body": {
          "sections": {
            "customSectionQualifier": {
              "template": "sap.fe.showcase.lrop.ext.CustomSection",
              "position": { "anchor": "Section", "placement": "After" },
              "title": "{i18n>CustomSection}"
            },
            "collectionFacetSection": {
              "subSections": {
                "customSubSectionQualifier": {
                  "template": "sap.fe.showcase.lrop.ext.CustomSubSection",
                  "title": "{i18n>customSubSection}",
                  "visible": true
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Footer determining actions and footer custom actions (CDS + manifest)

DESCRIPTION: Add UI.DataFieldForAction with Determining:true in UI.Identification to show actions in footer. Add custom footer actions via manifest content.footer.actions.

LANGUAGE: CDS

CODE:
```cds
annotate srv.RootEntities with @(
  UI.Identification : [
    {
      $Type : 'UI.DataFieldForAction',
      Action : 'LROPODataService.changeCriticality',
      Label : '{i18n>changeCriticality}',
      Determining : true,
      Criticality : criticality_code
    }
  ]
);
```

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (footer actions)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "content": {
        "footer": {
          "actions" : {
            "CustomActionOPFooter" : {
              "press": "sap.fe.showcase.lrop.ext.CustomActions.messageBox",
              "enabled": "{= ${ui>/editMode} !== 'Editable'}",
              "visible" : true,
              "text": "{i18n>CustomActionOPFooter}"
            }
          }
        }
      }
    }
  }
}
```

---

STEP: Custom Object Page for sub-entity (manifest targets + routing)

DESCRIPTION: Replace default sub-entity Object Page with custom component view. Use "sap.fe.core.fpm" component type and viewName to a custom XML view. Add route pattern for navigation.

LANGUAGE: JSON

CODE:
```json
// file: app/listreport-objectpage/webapp/manifest.json (targets)
"CustomObjectPage_childEntities3": {
  "type": "Component",
  "Id": "CustomObjectPageView",
  "name" : "sap.fe.core.fpm",
  "options": {
    "settings": {
      "viewName": "sap.fe.showcase.lrop.ext.view.CustomObjectPage",
      "entitySet": "ChildEntities3"
    }
  }
}

// file: app/listreport-objectpage/webapp/manifest.json (route)
{
  "pattern": "RootEntities({key})/childEntities3({key2}):?query:",
  "name": "CustomObjectPage_childEntities3",
  "target": "CustomObjectPage_childEntities3"
}
```

---

STEP: Worklist floorplan — hide filter bar (manifest)

DESCRIPTION: For Worklist, hide filter bar via hideFilterBar setting. Worklist is a List Report flavor.

LANGUAGE: JSON

CODE:
```json
// file: app/worklist/webapp/manifest.json (snippet)
"OrdersList": {
  "options": {
    "settings": {
      "hideFilterBar": true
    }
  }
}
```

---

STEP: How to obtain support

DESCRIPTION: Create an issue in repository or ask in SAP Community. Repo issue URL & SAP Community URL.

LANGUAGE: Text

CODE:
```text
Create an issue: https://github.com/SAP-samples/fiori-elements-feature-showcase/issues
Ask in SAP Community: https://answers.sap.com/questions/ask.html
```

---
--------------------------------
