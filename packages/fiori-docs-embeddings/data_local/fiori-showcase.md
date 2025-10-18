
--------------------------------

**TITLE**: SAP Fiori elements (OData V4) — Actionable Code Patterns & Examples (List Report & Object Page)

**INTRODUCTION**: This reference extracts actionable code patterns (CDS annotations, manifest.json settings, XML fragments, TS extension code, and property files) from the "fiori-elements-feature-showcase" sample. Use these ready-to-copy snippets and exact file locations to implement Fiori Elements features for List Report, Object Page, tables, filters, value helps, actions, charts, tree tables, personalization and custom extensions. Each step lists the goal, required file(s) and minimal code for direct use.

**TAGS**: SAP Fiori, OData V4, CAP, CDS, manifest.json, List Report, Object Page, value help, annotations, extension, TypeScript, XML, i18n

STEP: Project setup & run locally
DESCRIPTION: Install dependencies and run the CAP-based feature showcase locally. Opens Fiori launchpad sandbox at /$launchpad.
LANGUAGE: Shell
CODE:
```bash
# In repository root (see: https://github.tools.sap/fiori-elements/feature-showcase)
npm install
# Start CAP dev server
cds watch
# Open in browser:
# http://localhost:4008/$launchpad
```

STEP: Enable Draft for an entity (CDS)
DESCRIPTION: Add draft support to an entity by applying @odata.draft.enabled in a CDS service annotation. File: app/listreport-objectpage/field-control.cds or your service .cds.
LANGUAGE: CDS
CODE:
```cds
// example location: app/listreport-objectpage/field-control.cds
annotate srv.RootEntities with @odata.draft.enabled;
```

STEP: Replace standard UI texts (manifest + i18n)
DESCRIPTION: Provide a custom i18n file and reference it via enhanceI18n in manifest.json to override standard Fiori element texts. File: app/listreport-objectpage/webapp/manifest.json and i18n/customI18N.properties
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"RootEntityListReport": {
  "options": {
    "settings": {
      "enhanceI18n": "i18n/customI18N.properties"
    }
  }
}
```
LANGUAGE: properties
CODE:
```properties
# app/listreport-objectpage/webapp/i18n/customI18N.properties
C_COMMON_ACTION_PARAMETER_DIALOG_CANCEL|RootEntities = Custom cancel text
# Other keys:
# C_COMMON_DIALOG_OK
# C_TRANSACTION_HELPER_OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTTITLE_SINGULAR|RootEntities
# C_OPERATIONS_ACTION_CONFIRM_MESSAGE|RootEntities|criticalAction
```

STEP: Add a Custom Frontend Action (manifest + extension controller)
DESCRIPTION: Define a custom action in manifest.json and implement its handler in an extension controller. File: app/listreport-objectpage/webapp/manifest.json and app/listreport-objectpage/webapp/ext/controller/RootEntityLRExtension.controller.ts
LANGUAGE: JSON
CODE:
```json
// manifest.json (partial)
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
LANGUAGE: TypeScript
CODE:
```ts
// app/listreport-objectpage/webapp/ext/controller/RootEntityLRExtension.controller.ts (partial)
import ControllerExtension from "sap/fe/core/ControllerExtension";
import MessageBox from "sap/m/MessageBox";
import type { ExtensionAPI, Context, ODataContextBinding } from "sap/fe/core";

export default class RootEntityLRExtension extends ControllerExtension<ExtensionAPI> {
  messageBox() {
    MessageBox.alert("Button pressed");
  }
  enabled() {
    return true;
  }
  enabledForSingleSelect(oBindingContext: ODataContextBinding, aSelectedContexts: Context[]) {
    return !!aSelectedContexts && aSelectedContexts.length === 1;
  }
}
```

STEP: Invoke CAP action from custom UI handler via EditFlow API
DESCRIPTION: Use EditFlow.invokeAction from extension controller to call CAP actions (bound/unbound). File: extension controller .ts
LANGUAGE: TypeScript
CODE:
```ts
// app/listreport-objectpage/webapp/ext/controller/RootEntityOPExtension.controller.ts (partial)
// Search-Term: #EditFlowAPI
onChangeCriticality(oEvent: any) {
  const sActionName = "LROPODataService.changeCriticality";
  this.base.getExtensionAPI().getEditFlow().invokeAction(sActionName, {
    contexts: oEvent.getSource().getBindingContext() as any,
    model: oEvent.getSource().getModel() as any,
    label: 'Confirm',
    invocationGrouping: "ChangeSet"
  });
}
```

STEP: Default sorting & filtering via SelectionPresentationVariant
DESCRIPTION: Reference a @UI.SelectionPresentationVariant in manifest to apply default filters & presentation. File: app/listreport-objectpage/webapp/manifest.json and layout CDS for annotation.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"ChildEntities2List": {
  "options": {
    "settings": {
      "contextPath": "/ChildEntities2",
      "defaultTemplateAnnotationPath": "com.sap.vocabularies.UI.v1.SelectionPresentationVariant#DefaultFilter"
    }
  }
}
```
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (example)
annotate srv.RootEntities with @(
  UI.SelectionPresentationVariant #DefaultFilter : {
    SelectionVariant : {
      $Type : 'UI.SelectionVariantType',
      SelectOptions : [
        { PropertyName : criticality_code, Ranges : [{ Sign : #I, Option : #GT, Low : 0 }] }
      ]
    },
    PresentationVariant : {
      SortOrder : [{ Property : fieldWithPrice, Descending : false }],
      Visualizations : ['@UI.LineItem#simplified']
    }
  }
);
```

STEP: Enable/disable Variant Management (List Report table)
DESCRIPTION: Configure variantManagement via manifest.json or change subtitle fallback text. Files: manifest.json and webapp/i18n/i18n.properties
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
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
LANGUAGE: properties
CODE:
```properties
# app/listreport-objectpage/webapp/i18n/i18n.properties
appSubTitle=Custom App Subtitle
```

STEP: Enable Live Mode (auto apply filters)
DESCRIPTION: Remove "Go" button and apply filters/search immediately via liveMode true in manifest.json.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"RootEntityListReport": {
  "options": {
    "settings": {
      "liveMode": true
    }
  }
}
```

STEP: Filter defaults, hide filters, selection fields (CDS annotations)
DESCRIPTION: Use @Common.FilterDefaultValue, @UI.HiddenFilter, @UI.SelectionFields for filter defaults/hide and visible fields. Files: app/listreport-objectpage/field-control.cds and layout.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/field-control.cds (examples)
// Default value: use @Common.FilterDefaultValue
annotate srv.RootEntities {
  someDate @Common.FilterDefaultValue: '2025-01-01';
}

// Hide filter:
annotate srv.RootEntities {
  fieldWithURLtext @UI.HiddenFilter;
}

// Visible selection fields (layout.cds)
annotate srv.RootEntities with @(
  UI.SelectionFields : [
    field,
    fieldWithPrice,
    criticality_code
  ]
);
```

STEP: Mandatory filter fields (FilterRestrictions)
DESCRIPTION: Mark required filter properties using @Capabilities.FilterRestrictions.RequiredProperties. File: app/listreport-objectpage/capabilities.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/capabilities.cds (partial)
annotate srv.RootEntities with @(
  Capabilities.FilterRestrictions : {
    RequiredProperties : [
      stringProperty
    ]
  }
);
```

STEP: Enable semantic date selectors for date filters
DESCRIPTION: Use @Capabilities.FilterRestrictions.FilterExpressionRestrictions to allow semantic date ranges; optionally configure defaults in manifest.json.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/capabilities.cds (partial)
annotate srv.RootEntities with @(
  Capabilities.FilterRestrictions : {
    FilterExpressionRestrictions : [
      {
        Property : 'validFrom',
        AllowedExpressions : 'SingleRange'
      }
    ]
  }
);
```
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
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

STEP: Case-insensitive filtering for service
DESCRIPTION: Annotate the service in CDS with @Capabilities.FilterFunctions: ['tolower'] to enable case-insensitive filtering across filter bar, personalization, and value helps. File: app/listreport-objectpage/capabilities.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/capabilities.cds (partial)
annotate LROPODataService with @(
  Capabilities.FilterFunctions : [ 'tolower' ]
);
```

STEP: Value Help (Common.ValueList) for properties & fixed values
DESCRIPTION: Annotate an association or property with @Common.ValueList or @Common.ValueListWithFixedValues to provide value help dialog, dropdown or radio buttons. File: app/listreport-objectpage/value-helps.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/value-helps.cds (partial)
annotate schema.RootEntities with {
  contact @(Common : {
    Text            : contact.name,
    TextArrangement : #TextOnly,
    ValueList       : {
      Label          : '{i18n>customer}',
      CollectionPath : 'Contacts',
      Parameters     : [
        { $Type: 'Common.ValueListParameterInOut', ValueListProperty: 'ID', LocalDataProperty: contact_ID },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'country_code' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'city' }
      ]
    }
  });
  criticality_code @(Common : {
    ValueListWithFixedValues,
    ValueListWithFixedValues.@Common.ValueListShowValuesImmediately,
  });
}
```

STEP: Dependent value help (filtering by another property)
DESCRIPTION: Use Common.ValueListParameterIn/In to pass header property values (e.g. country -> region). File: value-helps.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/value-helps.cds (partial)
annotate schema.RootEntities with {
  region @(Common : {
    Text: region.name,
    TextArrangement: #TextFirst,
    ValueListWithFixedValues: true,
    ValueList: {
      Label: '{i18n>Region}',
      CollectionPath: 'Regions',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', ValueListProperty: 'code', LocalDataProperty: region_code },
        { $Type: 'Common.ValueListParameterOut', ValueListProperty: 'name', LocalDataProperty: region.name },
        { $Type: 'Common.ValueListParameterFilterOnly', ValueListProperty: 'country_code' },
        { $Type: 'Common.ValueListParameterIn', LocalDataProperty : country_code, ValueListProperty : 'country_code' }
      ]
    }
  });
}
```

STEP: Multi-Input dependent value help referencing parent (assignment entity)
DESCRIPTION: Map LocalDataProperty to parent root properties for assignment entities. Files: model CDS and annotations.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/value-helps.cds (partial)
annotate schema.AssignedRegions with {
  region @(Common : {
    Text            : region.name,
    TextArrangement : #TextFirst,
    ValueListWithFixedValues: true,
    ValueList       : {
      Label          : '{i18n>Region}',
      CollectionPath : 'Regions',
      Parameters     : [
        { $Type: 'Common.ValueListParameterInOut', ValueListProperty: 'code', LocalDataProperty: region_code },
        { $Type: 'Common.ValueListParameterIn', LocalDataProperty: root.country_code, ValueListProperty: 'country_code' }
      ]
    }
  });
}
```

STEP: Add a custom filter UI fragment (manifest + fragment + controller reset)
DESCRIPTION: Configure controlConfiguration.filterFields to reference an XML fragment, bind filter value to filterValues model using sap.fe.filter type, and implement reset via extension API. Files: manifest.json, ext fragment XML, extension controller .ts
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
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
LANGUAGE: XML
CODE:
```xml
<!-- app/listreport-objectpage/webapp/ext/CustomFilter-Rating.fragment.xml -->
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:l="sap.ui.layout">
  <HBox alignItems="Center" core:require="{handler: 'sap/fe/showcase/lrop/ext/CustomFilter-Rating'}" width="100%">
    <RatingIndicator id="MyCustomRatingIndicatorId" maxValue="4" class="sapUiTinyMarginBegin"
      value="{path: 'filterValues>', type: 'sap.fe.macros.filter.type.Value', formatOptions: { operator: 'GE' }}" />
    <core:Icon src="sap-icon://reset" press="handler.onReset" class="sapUiSmallMarginBegin" />
  </HBox>
</core:FragmentDefinition>
```
LANGUAGE: TypeScript
CODE:
```ts
// app/listreport-objectpage/webapp/ext/controller/RootEntityLRExtension.controller.ts (partial)
onResetRating(oEvent: any) {
  // "starsValue" is the property name used by controlConfiguration
  this.base.getExtensionAPI().setFilterValues("starsValue");
}
```

STEP: Annotate UI actions into table line items (bound/unbound/inline)
DESCRIPTION: Add UI.DataFieldForAction entries to @UI.LineItem. For unbound actions use EntityContainer path. Inline actions use Inline: true. Files: app/listreport-objectpage/layouts_RootEntities.cds (or equivalent)
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (partial)
// Bound action in line item:
annotate srv.RootEntities with @(
  UI.LineItem : [
    { $Type : 'UI.DataFieldForAction', Action : 'LROPODataService.changeCriticality', Label : '{i18n>changeCriticality}' },
    { $Type : 'UI.DataFieldForAction', Action : 'LROPODataService.changeProgress', Label : '{i18n>changeProgress}', IconUrl: 'sap-icon://status-critical', Inline: true }
  ]
);

// Unbound action (EntityContainer path)
annotate srv.RootEntities with @(
  UI.LineItem : [
    { $Type : 'UI.DataFieldForAction', Action : 'LROPODataService.EntityContainer/unboundAction', Label : '{i18n>unboundAction}' }
  ]
);
```

STEP: Enable/disable actions dynamically using @Core.OperationAvailable
DESCRIPTION: Annotate actions with @Core.OperationAvailable using $edmJson that points to a boolean path (singleton or bound context). Files: CDS action definitions.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (partial)
@Core.OperationAvailable: {$edmJson: {$Path: '/Singleton/enabled'}}
action unboundAction(@(title: '{i18n>inputValue}') input : String);
```
LANGUAGE: CDS
CODE:
```cds
// Bound action example using expression:
annotate srv.RootEntities with @(
  Core.OperationAvailable: ($self.integerValue > 0)
)
action changeProgress ( /* params */ );
```

STEP: Side effects for actions (ensure UI refresh)
DESCRIPTION: Use @Common.SideEffects on actions to declare TargetProperties that are modified by an action. Files: service CDS where action is declared.
LANGUAGE: CDS
CODE:
```cds
// srv/list-report-srv.cds (or service definition)
entity RootEntities as select from persistence.RootEntities actions {
  @(
    Common.SideEffects : { TargetProperties : ['in/integerValue'] }
  )
  action changeProgress (@(title : '{i18n>newProgress}', UI.ParameterDefaultValue : 50) newProgress : Integer);
};
```

STEP: Action parameter value help & default parameter value
DESCRIPTION: Annotate action parameter inline with Common.ValueList and UI.ParameterDefaultValue. Files: service CDS
LANGUAGE: CDS
CODE:
```cds
// srv/list-report-srv.cds (partial)
action changeCriticality (
  @(
    title: '{i18n>newCriticality}',
    UI.ParameterDefaultValue: 0,
    Common: {
      ValueListWithFixedValues: true,
      ValueList: {
        Label: '{i18n>Criticality}',
        CollectionPath: 'Criticality',
        Parameters: [
          { $Type: 'Common.ValueListParameterInOut', ValueListProperty: 'code', LocalDataProperty: newCriticality },
          { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
        ]
      }
    }
  )
  newCriticality : Integer
);
```

STEP: Group actions into a dropdown menu (manifest controlConfiguration)
DESCRIPTION: Use controlConfiguration under @com.sap.vocabularies.UI.v1.LineItem to add "MenuActions" menu button with referenced actions. File: manifest.json
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
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

STEP: Dynamic CRUD restrictions & hiding edit/create (capabilities)
DESCRIPTION: Use @Capabilities.DeleteRestrictions, UI.UpdateHidden, UI.CreateHidden with property paths or booleans. File: app/listreport-objectpage/capabilities.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/capabilities.cds (partial)
annotate srv.RootEntities with @(
  Capabilities.DeleteRestrictions : { Deletable : deletePossible },
  UI.UpdateHidden : updateHidden,
  UI.CreateHidden: { $edmJson: { $Path: '/Singleton/createHidden' } }
);
```

STEP: Navigation button (intent-based navigation) in line item
DESCRIPTION: Use UI.DataFieldForIntentBasedNavigation with SemanticObject + Action and optional Mapping. Also add inbound in sap.app crossNavigation in manifest.json. Files: layouts_RootEntities.cds and manifest.json (worklist/webapp/manifest.json)
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (partial)
annotate srv.RootEntities with @(
  UI.LineItem : [
    {
      $Type : 'UI.DataFieldForIntentBasedNavigation',
      Label : '{i18n>inboundNavigation}',
      SemanticObject : 'FeatureShowcaseChildEntity2',
      Action : 'manage',
      RequiresContext : true,
      Inline : true,
      IconUrl : 'sap-icon://cart',
      Mapping : [
        { $Type : 'Common.SemanticObjectMappingType', LocalProperty : integerValue, SemanticObjectProperty : 'integerProperty' }
      ],
      @UI.Importance : #High
    }
  ]
);
```
LANGUAGE: JSON
CODE:
```json
// app/worklist/webapp/manifest.json (partial)
"sap.app": {
  "crossNavigation": {
    "inbounds": {
      "feature-showcase-worklist": {
        "signature": { "parameters": {}, "additionalParameters": "allowed" },
        "semanticObject": "FeatureShowcaseChildEntity2",
        "action": "manage",
        "title": "Work List",
        "subTitle": "Manage"
      }
    }
  }
}
```

STEP: Mark actions as critical (confirm dialog)
DESCRIPTION: Use @Common.IsActionCritical : true on action annotation. Files: action CDS
LANGUAGE: CDS
CODE:
```cds
// action definition
annotate srv.criticalAction with @(
  Common.IsActionCritical : true
);
```

STEP: Send Message Toast from CAP backend
DESCRIPTION: Use req.notify in CAP handler to send a message with severity 1 (toast). File: srv/list-report-srv.js (or .ts) CAP handler
LANGUAGE: JavaScript
CODE:
```js
// srv/list-report-srv.js (CAP service handler)
module.exports = (srv) => {
  srv.on('someAction', async (req) => {
    // business logic...
    req.notify('Critical action pressed'); // severity 1 -> message toast
  });
};
```

STEP: Set table type (Responsive / Grid / Tree) in manifest.json
DESCRIPTION: Use controlConfiguration @LineItem.tableSettings.type to select table implementation. For TreeTable additional hierarchy annotations required in CDS. Files: manifest.json and service CDS
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.LineItem": {
          "tableSettings": { "type": "ResponsiveTable" }
        },
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
// app/listreport-objectpage/layouts_RootEntities.cds (partial)
annotate srv.OrganizationalUnits @Aggregation.RecursiveHierarchy #OrgUnitsHierarchy : {
  ParentNavigationProperty : superOrdinateOrgUnit,
  NodeProperty             : ID,
};

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
  Capabilities.SortRestrictions.NonSortableProperties: [
    'LimitedDescendantCount','DistanceFromRoot','DrillState','LimitedRank'
  ]
) columns {
  null as LimitedDescendantCount : Int16;
  null as DistanceFromRoot       : Int16;
  null as DrillState             : String;
  null as LimitedRank            : Int16;
};
```

STEP: Customize TreeTable behaviors and creation menu (manifest + extension hooks)
DESCRIPTION: Use creationMode with nodeType in manifest and implement extension hook isCreateEnabled and other hooks in controller for move/copy behaviors. Files: manifest.json and ext controller .ts
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"/OrganizationalUnits/@com.sap.vocabularies.UI.v1.LineItem": {
  "tableSettings": {
    "type": "TreeTable",
    "hierarchyQualifier": "OrgUnitsHierarchy",
    "creationMode": {
      "name": "CreationDialog",
      "createInPlace": true,
      "creationFields": "@com.sap.vocabularies.UI.v1.FieldGroup#creationDialog",
      "nodeType": {
        "propertyName": "category_code",
        "values": {
          "01": "Create a new department",
          "02": { "label": "Create a new division", "creationFields": "name,description,isActive" },
          "03": "Create a new business unit"
        }
      },
      "isCreateEnabled": ".extension.sap.fe.showcase.lrop.ext.controller.RootEntityLRExtension.isCreateEnabled"
    }
  }
}
```
LANGUAGE: TypeScript
CODE:
```ts
// app/listreport-objectpage/webapp/ext/controller/RootEntityLRExtension.controller.ts (partial)
isCreateEnabled(value: string, parentContext?: any) {
  switch (parentContext?.getProperty("category_code")) {
    case "03": return value === "02";
    case "02": return value === "01";
    case "01": return false;
    default: return value === "03";
  }
}
```

STEP: Multiple views (single table quickVariantSelection and multiple table views)
DESCRIPTION: Configure quickVariantSelection or views in manifest.json to define segmented/dropdown or tabs with SelectionVariant/SelectionPresentationVariant qualifiers.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (single table mode)
"RootEntityListReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "@com.sap.vocabularies.UI.v1.LineItem": {
          "tableSettings": {
            "quickVariantSelection": {
              "paths": [
                {"annotationPath":"com.sap.vocabularies.UI.v1.SelectionVariant#variant1"},
                {"annotationPath":"com.sap.vocabularies.UI.v1.SelectionVariant#variant2"}
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

// app/listreport-objectpage/webapp/manifest.json (multiple table mode)
"RootEntityListReport": {
  "options": {
    "settings": {
      "views": {
        "paths": [
          {"key":"tab1","annotationPath":"com.sap.vocabularies.UI.v1.SelectionVariant#variant1"},
          {"key":"tab2","annotationPath":"com.sap.vocabularies.UI.v1.SelectionPresentationVariant#SelectionPresentationVariant"},
          {"key":"tab3","entitySet":"OrganizationalUnits","annotationPath":"com.sap.vocabularies.UI.v1.SelectionVariant#activeOrgUnits"}
        ],
        "showCounts": false
      }
    }
  }
}
```

STEP: Creation Dialog triggered by @Core.Immutable
DESCRIPTION: Annotate properties as @Core.Immutable to force providing values at entity creation (dialog shows these fields). Files: CDS
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layout.cds or relevant CDS
annotate srv.RootEntities {
  stringProperty @Core.Immutable;
}
```

STEP: Default table sort order via UI.PresentationVariant
DESCRIPTION: Use @UI.PresentationVariant with SortOrder and Visualizations to set default ordering for the table. Files: layout.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layout.cds (partial)
annotate srv.RootEntities with @(
  UI.PresentationVariant : {
    SortOrder : [
      { Property : field, Descending : false }
    ],
    Visualizations : [ '@UI.LineItem' ]
  }
);
```

STEP: Enable multiple selection in tables (manifest)
DESCRIPTION: Set tableSettings.selectionMode "Multi" under controlConfiguration for the table in manifest.json.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
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

STEP: Semantic keys in CDS (bold display)
DESCRIPTION: Use Common.SemanticKey to mark fields shown in bold in UI. File: layouts_RootEntities.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (partial)
annotate srv.RootEntities with @(
  Common.SemanticKey : [ field ]
);
```

STEP: DataPoint: Rating & Progress in LineItem or Header
DESCRIPTION: Define @UI.DataPoint with Visualization #Rating or #Progress and reference it via UI.DataFieldForAnnotation in @UI.LineItem or Header facets. Files: layouts_RootEntities.cds
LANGUAGE: CDS
CODE:
```cds
// Rating DataPoint
annotate srv.RootEntities with @(
  UI.DataPoint #ratingIndicator : {
    Value : starsValue,
    TargetValue : 4,
    Visualization : #Rating,
    Title : '{i18n>ratingIndicator}',
    @Common.QuickInfo : 'Tooltip via Common.QuickInfo'
  }
);
// add to line item
annotate srv.RootEntities with @(
  UI.LineItem : [
    { $Type : 'UI.DataFieldForAnnotation', Label : '{i18n>ratingIndicator}', Target : '@UI.DataPoint#ratingIndicator', @UI.Importance : #Low }
  ]
);
```

STEP: Tooltip on field via DataPoint workaround
DESCRIPTION: Create a UI.DataPoint with Only Value and @Common.QuickInfo then add @UI.DataFieldForAnnotation to show tooltip in table. Files: layouts_RootEntities.cds
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
    { $Type : 'UI.DataFieldForAnnotation', Target : '@UI.DataPoint#fieldWithTooltip', Label : '{i18n>fieldWithToolTip}' }
  ]
);
```

STEP: Smart Micro Chart / Charts (UI.Chart + UI.DataPoint)
DESCRIPTION: Define UI.Chart with Measures/Dimensions and UI.DataPoint(s) and reference chart via UI.DataFieldForAnnotation for tables or UI.ReferenceFacet for header/chart sections. Files: layouts_RootEntities.cds and ChartDataEntities annotation files.
LANGUAGE: CDS
CODE:
```cds
// Example radial chart + datapoint
annotate srv.RootEntities with @(
  UI.DataPoint #radialChart : { Value : integerValue, TargetValue : targetValue, Criticality : criticality_code },
  UI.Chart #radialChart : {
    Title : '{i18n>radialChart}',
    Description : '{i18n>ThisIsAMicroChart}',
    ChartType : #Donut,
    Measures : [integerValue],
    MeasureAttributes : [
      { $Type:'UI.ChartMeasureAttributeType', Measure: integerValue, Role: #Axis1, DataPoint : '@UI.DataPoint#radialChart' }
    ]
  },
  UI.LineItem : [
    { $Type : 'UI.DataFieldForAnnotation', Target : '@UI.Chart#radialChart', Label : '{i18n>radialChart}' }
  ]
);
```

STEP: Quick View Facet & Contact Quick View (association)
DESCRIPTION: Annotate associated entity with UI.QuickViewFacets and UI.HeaderInfo / Communication.Contact for contact quickview; add DataField pointing to association key to display quick view popup. Files: labels.cds, layouts_RootEntities.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (partial)
annotate srv.ChildEntities2 with @(
  UI.FieldGroup #data : {
    Data : [ {Value : field2}, {Value : integerProperty}, {Value : field4} ]
  },
  UI.HeaderInfo : {
    TypeName : '{i18n>ChildEntity2}',
    Title : { $Type: 'UI.DataField', Value : '{i18n>ChildEntity2}' },
    Description : { $Type: 'UI.DataField', Value : field }
  },
  UI.QuickViewFacets : [
    { $Type : 'UI.ReferenceFacet', Target : '@UI.FieldGroup#data' }
  ]
);

annotate srv.RootEntities with @(
  UI.LineItem : [
    { $Type : 'UI.DataField', Value : association2one_ID, Label : '{i18n>ChildEntity2}', @UI.Importance : #High }
  ]
);

// contact quick view card in contact entity
annotate srv.Contacts with @(
  Communication.Contact : {
    fn   : name,
    kind : #org,
    tel  : [{ uri: phone, type: #preferred }],
    adr  : [{ building: building, country: country.name, street: street, locality: city, code: postCode, type: #preferred }]
  }
);
```

STEP: Image column in table (IsImageURL)
DESCRIPTION: Set property annotated with @UI.IsImageURL and add DataField referencing URL property to @UI.LineItem. Files: labels.cds and layouts_RootEntities.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/labels.cds
imageUrl @UI.IsImageURL;

// app/listreport-objectpage/layouts_RootEntities.cds
annotate srv.RootEntities with @(
  UI.LineItem : [
    { $Type : 'UI.DataField', Value : imageUrl, @UI.Importance : #High }
  ]
);
```

STEP: Currency / UoM fields (Measures.Unit / Measures.ISOCurrency)
DESCRIPTION: Annotate value property with @Measures.Unit or @Measures.ISOCurrency tying to unit/currency key. For custom unit scale use CodeList.UnitsOfMeasure and @Common.UnitSpecificScale. Files: labels.cds and service CDS
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/labels.cds (example)
fieldWithUoM @Measures.Unit : uom_code;
fieldWithCurrency @Measures.ISOCurrency : currency_code;

// Custom unit scale sample
@CodeList.UnitsOfMeasure : { Url : './$metadata', CollectionPath : 'UnitOfMeasures' }
service LROPODataService @(path : '/srv1') {
  entity UnitOfMeasures as projection on persistence.UnitOfMeasures;
}

entity sap.common.UnitOfMeasures : CodeList {
  key code : String(30) @Common.Text : descr @Common.UnitSpecificScale : scale @CodeList.ExternalCode : name;
  scale : Integer;
};
```

STEP: Add DataFieldWithUrl link and link target behavior
DESCRIPTION: Add UI.DataFieldWithUrl to line items, and optionally annotate link target. Files: layouts_RootEntities.cds and labels.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds
@UI.LineItem : [
  {
    $Type : 'UI.DataFieldWithUrl',
    Url   : fieldWithURL,       // target
    Value : fieldWithURLtext,   // visible text
    Label : '{i18n>dataFieldWithURL}',
    @UI.Importance : #Medium
  }
]

// to open in new tab (UI5 >= 1.129.0)
annotate srv.RootEntities with {
  fieldWithURLtext @HTML5.LinkTarget : '_blank';
}
```

STEP: Add custom column via XML fragment + manifest column configuration
DESCRIPTION: Create XML fragment for column template and register it under controlConfiguration.@LineItem.columns in manifest.json. Files: fragment xml under webapp/ext and manifest.json
LANGUAGE: XML
CODE:
```xml
<!-- app/listreport-objectpage/webapp/ext/CustomColumn-DateRangeLR.fragment.xml -->
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m">
  <Label text="{validFrom} - {validTo}" />
</core:FragmentDefinition>
```
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
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
```

STEP: Object Page — HeaderInfo (Title, Subtitle, dynamic concat)
DESCRIPTION: Define @UI.HeaderInfo in CDS with DataField expressions or odata.concat expressions for dynamic title/description. File: layouts_RootEntities.cds
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds
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

// dynamic concatenation example
annotate service.ChildEntities1 with @(
  UI.HeaderInfo : {
    Description : { Value : ('Using odata.concat - Field: ' || field) }
  }
);
```

STEP: Header facets & header field groups (ReferenceFacet & FieldGroup)
DESCRIPTION: Add UI.FieldGroup and add it to UI.HeaderFacets as ReferenceFacet; support contact quick view, address facet and data points. Files: layouts_RootEntities.cds and labels.cds
LANGUAGE: CDS
CODE:
```cds
// field group & header facet sample
annotate srv.RootEntities with @(
  UI.FieldGroup #HeaderData : {
    Data : [
      { Value : field },
      { Value : fieldWithCriticality, Criticality : criticality_code },
      { Value : fieldWithUoM },
      { Value : association2one_ID },
      { $Type : 'UI.DataFieldForAnnotation', Target : 'contact/@Communication.Contact', Label : '{i18n>contact}' }
    ]
  },
  UI.HeaderFacets : [
    { $Type : 'UI.ReferenceFacet', Target : '@UI.FieldGroup#HeaderData', Label : '{i18n>HeaderData}' }
  ]
);
```

STEP: Header custom facet via manifest (XML template + manifest entry)
DESCRIPTION: Register an XML fragment as a custom header facet under content.header.facets in manifest.json and optionally provide templateEdit for edit mode. Files: webapp/ext fragment and manifest.json
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"childEntities1ObjectPage": {
  "options": {
    "settings": {
      "content": {
        "header": {
          "facets": {
            "CustomHeaderFacet": {
              "template": "sap.fe.showcase.lrop.ext.CustomHeaderFacet-ProcessFlow",
              "templateEdit": "sap.fe.showcase.lrop.ext.CustomHeaderFacet-Edit",
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

STEP: Object Page — add subpage (routing + target)
DESCRIPTION: Add a route pattern and target for a sub-entity (child page) in manifest.json and wire navigation from parent navigation entry. Files: app/listreport-objectpage/webapp/manifest.json
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
// Add route
"routing": {
  "routes": [
    {
      "pattern": "RootEntities({key})/ChildEntities1({key2}):?query:",
      "name": "childEntities1ObjectPage",
      "target": "childEntities1ObjectPage"
    }
  ],
  "targets": {
    "childEntities1ObjectPage": {
      "type": "Component",
      "id": "childEntities1ObjectPage",
      "name": "sap.fe.templates.ObjectPage",
      "options": { "settings": { "entitySet": "ChildEntities1" } }
    }
  }
}

// Link navigation from parent
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "navigation": {
        "childEntities1": { "detail": { "route": "childEntities1ObjectPage" } }
      }
    }
  }
}
```

STEP: Object Page — sideContent (manifest + extension API toggle)
DESCRIPTION: Add sideContent template for a section in manifest.json and show/hide using ExtensionAPI.showSideContent() from extension controller. Files: manifest.json and extension controller .ts
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "content": {
        "body": {
          "sections": {
            "customSectionQualifier": {
              "sideContent": { "template": "sap.fe.showcase.lrop.ext.SideContent", "equalSplit": true }
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
// app/listreport-objectpage/webapp/ext/controller/RootEntityOPExtension.controller.ts (partial)
toggleSideContent(oBindingContext: any) {
  this.base.getExtensionAPI().showSideContent("customSectionQualifier");
}
toggleSideContentItem1() {
  this.base.getExtensionAPI().showSideContent("childEntities1Section");
}
```

STEP: Object Page — add table section with personalization, quickVariantSelection, enableFullScreen & creationMode
DESCRIPTION: Configure controlConfiguration for child entity line item to enable personalization, quickVariantSelection (segmented buttons), enableFullScreen, creationMode (Inline/NewPage) and enableExport. Files: manifest.json
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"RootEntityObjectReport": {
  "options": {
    "settings": {
      "controlConfiguration": {
        "childEntities1/@com.sap.vocabularies.UI.v1.LineItem": {
          "tableSettings": {
            "personalization": { "column": true, "sort": false, "filter": true },
            "quickVariantSelection": {
              "paths": [
                {"annotationPath":"com.sap.vocabularies.UI.v1.SelectionVariant#variant1"},
                {"annotationPath":"com.sap.vocabularies.UI.v1.SelectionVariant#variant2"}
              ],
              "hideTableTitle": false, "showCounts": true
            },
            "enableFullScreen": true,
            "creationMode": { "name": "Inline", "createAtEnd": true },
            "enableExport": true
          },
          "actions": {
            "CustomActionOPTableToolbar": {
              "press": "sap.fe.showcase.lrop.ext.CustomActions.messageBox",
              "enabled": "{= %{deletePossible} === true}",
              "visible": true,
              "text": "{i18n>CustomActionOPTableToolbar (enabled when delete enabled)}"
            }
          }
        }
      }
    }
  }
}
```

STEP: Chart section (aggregation + aggregated properties + UI.Chart)
DESCRIPTION: Annotate chart data entity with Aggregation.ApplySupported, Analytics.AggregatedProperties, UI.Chart and add UI.ReferenceFacet to UI.Facets on RootEntities. Files: CDS annotations and manifest if needed.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/chart-entities.cds (partial)
annotate srv.ChartDataEntities with @(
  Aggregation.ApplySupported : {
    GroupableProperties : [ dimensions, criticality_code ],
    AggregatableProperties : [{ Property : integerValue }]
  }
);

annotate service.ChartDataEntities with @(
  Analytics.AggregatedProperties : [
    { Name: 'minAmount', AggregationMethod: 'min', AggregatableProperty: 'integerValue', @Common.Label: 'Minimal Net Amount' },
    { Name: 'maxAmount', AggregationMethod: 'max', AggregatableProperty: 'integerValue', @Common.Label: 'Maximal Net Amount' },
    { Name: 'avgAmount', AggregationMethod: 'average', AggregatableProperty: 'integerValue', @Common.Label: 'Average Net Amount' }
  ]
);

annotate service.ChartDataEntities with @(
  UI.Chart : {
    Title: '{i18n>chart}',
    ChartType: #Column,
    Measures: [maxAmount],
    Dimensions: [dimensions],
    MeasureAttributes: [{ $Type: 'UI.ChartMeasureAttributeType', Measure: maxAmount, Role: #Axis1 }]
  }
);

// reference facet on RootEntities:
annotate srv.RootEntities with @(
  UI.Facets : [
    { $Type : 'UI.ReferenceFacet', Target : 'chartEntities/@UI.Chart', Label : '{i18n>chart}' }
  ]
);
```

STEP: Custom Object Page for child entity (custom view target + route)
DESCRIPTION: Create a custom Object Page view and register a target using type "Component" and name "sap.fe.core.fpm" in manifest.targets and add a route pattern to point to that target. Files: manifest.json and new XML view under webapp/ext/view
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (partial)
"CustomObjectPage_childEntities3": {
  "type": "Component",
  "Id": "CustomObjectPageView",
  "name": "sap.fe.core.fpm",
  "options": {
    "settings": {
      "viewName": "sap.fe.showcase.lrop.ext.view.CustomObjectPage",
      "entitySet": "ChildEntities3"
    }
  }
}
// add corresponding route:
{
  "pattern": "RootEntities({key})/childEntities3({key2}):?query:",
  "name": "CustomObjectPage_childEntities3",
  "target": "CustomObjectPage_childEntities3"
}
```

STEP: Worklist (List Report flavor) — hide filter bar
DESCRIPTION: For Worklist floorplan, disable filter bar in manifest.json using hideFilterBar. File: app/worklist/webapp/manifest.json
LANGUAGE: JSON
CODE:
```json
// app/worklist/webapp/manifest.json (partial)
"ChildEntities2List": {
  "options": {
    "settings": {
      "hideFilterBar": true
    }
  }
}
```

STEP: How to obtain support / issue reporting
DESCRIPTION: Create GitHub issue or ask in SAP Community. Reference links from original repo README.
LANGUAGE: Text
CODE:
```text
Create an issue: https://github.com/SAP-samples/fiori-elements-feature-showcase/issues
Ask for help: https://answers.sap.com/questions/ask.html
```
--------------------------------
