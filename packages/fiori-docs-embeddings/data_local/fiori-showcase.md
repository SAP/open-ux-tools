
--------------------------------

**TITLE**: SAP Fiori elements for OData V4 — Feature Showcase: Code Examples & Implementation Recipes

**INTRODUCTION**: This reference extracts actionable code examples and implementation guidance from the "SAP Fiori elements for OData V4 Feature Showcase". Use these snippets and short, task-focused instructions to implement List Report, Object Page, Table, Chart, Value Help, Actions, Tree Table and other features in a CAP + SAP Fiori elements V4 app. All file paths and code blocks are preserved for direct use.

**TAGS**: CAP, CDS, ODataV4, FioriElements, manifest.json, annotations, TypeScript, XML, JSON

STEP: Project startup
DESCRIPTION: Install dependencies in repository root and run the CAP server to open the Fiori launchpad sandbox at /$launchpad.
LANGUAGE: Shell
CODE:
```bash
# In root folder (repository)
npm install

# Start CAP with watch (serves the application)
cds watch

# Open in browser:
# http://localhost:4008/$launchpad
```

STEP: Enable Draft mode (CDS annotation)
DESCRIPTION: Add draft support to an entity via @odata.draft.enabled in CDS.
LANGUAGE: CDS
CODE:
```cds
annotate srv.RootEntities with @odata.draft.enabled;
```

STEP: Replace standard UI texts (manifest + properties)
DESCRIPTION: Add a custom i18n file and reference it in manifest.json under the specific page settings using "enhanceI18n".
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "enhanceI18n": "i18n/customI18N.properties",
            ...
        }
    }
},
```

LANGUAGE: Properties
CODE:
```properties
# i18n/customI18N.properties sample keys
C_COMMON_ACTION_PARAMETER_DIALOG_CANCEL|RootEntities = Custom cancel text
# Examples of override keys:
# C_COMMON_DIALOG_OK (global)
# C_TRANSACTION_HELPER_OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTTITLE_SINGULAR|RootEntities
# C_OPERATIONS_ACTION_CONFIRM_MESSAGE|RootEntities|criticalAction
```

STEP: Add custom front-end action (manifest + controller)
DESCRIPTION: Define a custom action in manifest.json controlConfiguration and implement handler in extension controller. "press" is path to handler function. "enabled" can reference a function path.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (snippet)
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
// app/listreport-objectpage/webapp/ext/controller/RootEntityLRExtension.controller.ts (snippet)
export default class RootEntityLRExtension extends ControllerExtension<ExtensionAPI> {
  messageBox() {
      MessageBox.alert("Button pressed");
  }
  enabled() {
      return true;
  }
  enabledForSingleSelect(oBindingContext: ODataContextBinding, aSelectedContexts: [Context]) {
      if (aSelectedContexts && aSelectedContexts.length === 1) {
          return true;
      }
      return false;
  }
}
```

STEP: Invoke CAP action from custom action (EditFlow API)
DESCRIPTION: Invoke a CAP action from a client-side handler using the SAP Fiori elements Edit-flow API's invokeAction. Provide contexts, model, label, and invocationGrouping where applicable.
LANGUAGE: TypeScript
CODE:
```ts
// Extension example using EditFlow API to invoke CAP action
export default class RootEntityOPExtension extends ControllerExtension<ExtensionAPI> {
    ...

    // Search-Term: #EditFlowAPI
    onChangeCriticality(oEvent: Button$PressEvent) {
        let sActionName = "LROPODataService.changeCriticality";
        this.base.getExtensionAPI().getEditFlow().invokeAction(sActionName, {
            contexts: oEvent.getSource().getBindingContext()! as Context,
            model: oEvent.getSource().getModel() as ODataModel,
            label: 'Confirm',	
            invocationGrouping: "ChangeSet" 
        }); //SAP Fiori elements EditFlow API
    }
}
```

STEP: Default sorting/filtering via SelectionPresentationVariant (manifest)
DESCRIPTION: Reference a UI.SelectionPresentationVariant annotation in manifest to apply default filters and sort. Only SelectionPresentationVariant (not SelectionVariant only) is allowed for defaultTemplateAnnotationPath.
LANGUAGE: JSON
CODE:
```json
// app/worklist/webapp/manifest.json (snippet)
"OrdersList": {
    ...
    "options": {
        "settings": {
            "contextPath": "/Orders",
            "defaultTemplateAnnotationPath": "com.sap.vocabularies.UI.v1.SelectionPresentationVariant#DefaultFilter",
            ...
        }
    }
}
```

STEP: Disable Variant Management or set app subtitle (manifest + i18n)
DESCRIPTION: Disable Variant Management for a view and set a custom app subtitle visible in the header via sap.app.subTitle manifest property and i18n.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            "entitySet": "RootEntities",
            "variantManagement": "None",
            ...
        }
    }
}
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (sap.app snippet)
"sap.app": {
    ...
    "subTitle": "{{appSubTitle}}",
    ...
}
```

STEP: Enable Live Mode (manifest)
DESCRIPTION: Remove GO button by enabling live filtering; set liveMode true in view settings.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            "liveMode": true,
            ...
        }
    }
}
```

STEP: Default filter values (CDS)
DESCRIPTION: Use @Common.FilterDefaultValue in CDS to set simple default filter values for selection fields. For complex filters use SelectionPresentationVariant instead.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/field-control.cds (example usage)
annotate srv.RootEntities {
    // Example default value annotation usage
    someFilterField @(Common.FilterDefaultValue: 'example');
};
```

STEP: Hide filters (CDS)
DESCRIPTION: Annotate a property with @UI.HiddenFilter to hide it from filter bar.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/field-control.cds (snippet)
annotate srv.RootEntities {
    ...
    fieldWithURLtext @UI.HiddenFilter;
    ...
};
```

STEP: Group filter facets (CDS)
DESCRIPTION: Use @UI.FilterFacets and @UI.FieldGroup to structure filter adaptation groups. Reference in layout.cds.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layout.cds (snippet)
annotate srv.RootEntities with @(
    UI.FilterFacets : [
        {
            Target : '@UI.FieldGroup#chartData',
            Label : '{i18n>chartData}',
        },
        {
            Target : '@UI.FieldGroup#location',
            Label : '{i18n>location}',
        },
    ],
);
annotate srv.RootEntities with @(
    UI.FieldGroup #chartData : {
        Data  : [
            {Value : integerValue},
            {Value : targetValue},
            {Value : forecastValue},
            {Value : dimensions},
            {Value : integerValue},
        ]
    },
);
```

STEP: Show selection fields in filter bar (CDS)
DESCRIPTION: Use @UI.SelectionFields to predefine fields visible in the List Report filter bar.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layout.cds (snippet)
annotate srv.RootEntities with @(
    UI.SelectionFields : [
        field,
        fieldWithPrice,
        criticality_code,
    ],
);
```

STEP: Define mandatory filter fields (CDS)
DESCRIPTION: Use @Capabilities.FilterRestrictions.RequiredProperties to require fields in filter bar.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/capabilities.cds (snippet)
annotate srv.RootEntities with @(
    ...
    Capabilities.FilterRestrictions : {
        ...
        RequiredProperties : [
            stringProperty 
        ],
    },
);
```

STEP: Enable semantic date ranges (CDS + manifest)
DESCRIPTION: Configure permitted expressions for date fields using FilterExpressionRestrictions. Control client behavior via manifest controlConfiguration (useSemanticDateRange and defaultValues).
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layout.cds (snippet)
annotate srv.RootEntities with @(
    Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            {
                Property : 'validFrom',
                AllowedExpressions : 'SingleRange'
            }
        ],
        ...
    },
);
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (snippet)
"RootEntityListReport": {
    "options": {
        "settings": {
            "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.SelectionFields": {
                    "useSemanticDateRange":  true,
                    "filterFields": {
                        "validFrom": { 
                            "settings": {
                                "defaultValues": [{"operator": "LASTYEARS", "values": [10]}]
                            }
                        }
                    }
                }
            },
        }
    }
},
```

STEP: Case-insensitive filtering (CDS)
DESCRIPTION: Annotate the service with @Capabilities.FilterFunctions: ['tolower'] to enable tolower-based filtering across service.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/capabilities.cds (snippet)
annotate LROPODataService with @(
    Capabilities.FilterFunctions : [
        'tolower'
    ],
);
```

STEP: Value Help for filters and fields (CDS)
DESCRIPTION: Annotate properties with @Common.ValueList to provide value help dialogs. Use parameters to map local and value-list properties. Use ValueListWithFixedValues to render dropdown or with ValueListShowValuesImmediately for radio buttons.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/value-helps.cds (example)
annotate schema.RootEntities with{
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
                    ValueListProperty: 'country_code',
                },
                {
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'city',
                }
                
            ]
        }
    });
};
```

LANGUAGE: CDS
CODE:
```cds
// Value help as dropdown or radio buttons (value-helps.cds)
annotate schema.RootEntities with{
    criticality_code @(Common : {
        ValueListWithFixedValues,
        ValueListWithFixedValues.@Common.ValueListShowValuesImmediately,
    });
};
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (format radio layout horizontal/vertical)
"RootEntityListReport": {
    "options": {
        "settings": {
            "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.SelectionFields": {
                    "formatOptions": {
                        "radioButtonsHorizontalLayout": false
                    }
                }
            }
        }
    }
}
```

STEP: Dependent Value Help (CDS)
DESCRIPTION: Use ValueList parameters to filter value help results based on another field (Common.ValueListParameterIn).
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/value-helps.cds (dependent VH)
annotate schema.RootEntities with{
    ...
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
                    $Type: 'Common.ValueListParameterOut',
                    ValueListProperty: 'name',
                    LocalDataProperty : region.name,
                },
                //To only show the connected values
                {
                    $Type : 'Common.ValueListParameterFilterOnly',
                    ValueListProperty : 'country_code',
                },
                {
                    $Type : 'Common.ValueListParameterIn', //Input parameter used for filtering
                    LocalDataProperty : country_code,
                    ValueListProperty : 'country_code',
                },
                
            ]
        }
    });
};
```

STEP: Constant-filtered Value Help (CDS)
DESCRIPTION: Use ValueListParameterConstant to statically filter value help results to a constant.
LANGUAGE: CDS
CODE:
```cds
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
                    Constant : 'DE',
                },
            ]
        }
    });
}
```

STEP: Multi-input dependent Value Help using parent reference (CDS)
DESCRIPTION: For multi-input fields where assigned items use a parent reference, reference parent property via LocalDataProperty path like root.country_code.
LANGUAGE: CDS
CODE:
```cds
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
                    ValueListProperty   : 'country_code',
                },
                
            ]
        }
    });
}
```

STEP: Add navigation properties to filters and Adapt Filters dialog (CDS + manifest)
DESCRIPTION: Include navigation properties in @UI.SelectionFields and configure manifest controlConfiguration navigationProperties to show in Adapt Filters dialog.
LANGUAGE: CDS
CODE:
```cds
// Add navigation property to filter bar
annotate srv.RootEntities with @(
    UI.SelectionFields : [
        ...
        childEntities1.criticalityValue_code
    ],
);
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (Adapt Filters dialog navigationProperties)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.SelectionFields": {
                    "navigationProperties":  [ "childEntities1", "Order/decimalProperty" ],
                    ...
                }
            },
            ...
        }
    }
},
```

STEP: Custom filter (manifest + fragment + controller)
DESCRIPTION: Add a custom filter template fragment via manifest.controlConfiguration under SelectionFields.filterFields -> template path. Build fragment to bind to filterValues> with correct filter type, add reset handler via extension API setFilterValues.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (custom filter registration)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                ...
                "@com.sap.vocabularies.UI.v1.SelectionFields": {
                    "filterFields": {
                        "starsValue": {
                            "label": "{i18n>customFilter}",
                            "property": "starsValue",
                            "template": "sap.fe.showcase.lrop.ext.CustomFilter-Rating"
                        }
                    }
                }
            },
            ...
        }
    }
},
```

LANGUAGE: XML
CODE:
```xml
<!-- webapp/ext/CustomFilter-Rating.fragment.xml -->
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:l="sap.ui.layout">
	<!-- Search-Term: "customFilter" -->
	<HBox alignItems="Center" core:require="{handler: 'sap/fe/showcase/lrop/ext/CustomFilter-Rating'}" width="100%" >
			<!-- Example for using GE (greater than) instead of default EQ operator -->
			<RatingIndicator
				id="MyCustomRatingIndicatorId" maxValue="4" class="sapUiTinyMarginBegin"
				value="{path: 'filterValues>', type: 'sap.fe.macros.filter.type.Value', formatOptions: { operator: 'GE' }}"
			/>
			<core:Icon src="sap-icon://reset" press="handler.onReset" class="sapUiSmallMarginBegin" />
	</HBox>
</core:FragmentDefinition>
```

LANGUAGE: TypeScript
CODE:
```ts
// Extension controller reset implementation (snippet)
export default class RootEntityLRExtension extends ControllerExtension<ExtensionAPI> {
    ...

    onResetRating(oEvent: Button$PressEvent) {
        this.base.getExtensionAPI().setFilterValues("starsValue");
    }
}
```

STEP: Configure table actions (CDS line item annotations)
DESCRIPTION: Add bound and unbound actions to @UI.LineItem. For unbound actions refer to EntityContainer/unboundAction. Use @Core.OperationAvailable for enabling/disabling. Add Inline: true to show an inline icon.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (line item actions)
annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'LROPODataService.changeCriticality',
            Label : '{i18n>changeCriticality}',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'LROPODataService.changeProgress',
            Label : '{i18n>changeProgess}',
            IconUrl : 'sap-icon://status-critical',
            Inline : true,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'LROPODataService.EntityContainer/unboundAction',
            Label : '{i18n>unboundAction}',
        },
        ...
    ],
);
```

LANGUAGE: CDS
CODE:
```cds
// Example: @Core.OperationAvailable with $edmJson path to singleton
@Core.OperationAvailable: {$edmJson: {$Path: '/Singleton/enabled'}}
action unboundAction(@(title : '{i18n>inputValue}')input : String);
```

STEP: Side effects for actions (CDS)
DESCRIPTION: Annotate actions with Common.SideEffects describing TargetProperties to update UI after action invocation.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (action side effects)
entity RootEntities as select from persistence.RootEntities actions {
    ...
    @(
        Common.SideEffects              : {
            TargetProperties : ['in/integerValue']
        }
    )
    action changeProgress (@(title : '{i18n>newProgress}', UI.ParameterDefaultValue : 50)newProgress : Integer);
};
```

STEP: Value help for action parameter & default parameter values (CDS)
DESCRIPTION: Annotate action parameters inline with Common.ValueList to provide VH; use UI.ParameterDefaultValue for defaults.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (value-help & default)
entity RootEntities as select from persistence.RootEntities actions {
    ...
    action changeCriticality (
        @(
            title         : '{i18n>newCriticality}',
            UI.ParameterDefaultValue : 0,
            Common        : {
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
                    },
                    ]
                }
            }
        )
        newCriticality : Integer);
    ...
};
```

STEP: Create action menu grouping (manifest)
DESCRIPTION: Add a "MenuActions" entry under controlConfiguration @com.sap.vocabularies.UI.v1.LineItem.actions and include action identifiers using a double-colon format for unbound actions (EntityContainer::unboundAction).
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (action menu)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
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
                    },
                    ...
                },
                ...
            }
        }
    }
},
```

STEP: Dynamic CRUD restrictions (CDS / singleton paths)
DESCRIPTION: Use Capabilities Delete/Update/Create restrictions; reference singleton path with absolute '/Singleton/property' for dynamic values. Use UI.UpdateHidden to hide Edit button.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/capabilities.cds (dynamic CRUD)
annotate srv.RootEntities with @(
    Capabilities.DeleteRestrictions : {
        Deletable : deletePossible,
    },
    UI.UpdateHidden : updateHidden,
    UI.CreateHidden: { $edmJson: { $Path: '/Singleton/createHidden' } },
);
```

STEP: Add navigation button to another app (intent-based) from table (CDS + manifest inbound)
DESCRIPTION: Add UI.DataFieldForIntentBasedNavigation in @UI.LineItem with SemanticObject and Mapping; declare inbound in sap.app.crossNavigation.inbounds in manifest with semanticObject and action.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (intent nav)
annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
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
                    SemanticObjectProperty : 'integerProperty',
                },
            ],
            @UI.Importance : #High,
        },
        ...
    ],
);
```

LANGUAGE: JSON
CODE:
```json
// app/worklist/webapp/manifest.json (sap.app crossNavigation inbound)
"sap.app" : {
    ...,
    "crossNavigation": {
        "inbounds": {
            "feature-showcase-worklist": {
                "signature": {
                    "parameters": {},
                    "additionalParameters": "allowed"
                },
                "semanticObject": "FeatureShowcaseOrder",
                "action": "manage",
                "title": "Work List",
                "subTitle": "Manage"
            }
        }
    }
}
```

STEP: Mark actions as critical (CDS)
DESCRIPTION: Add @Common.IsActionCritical : true to annotate action requiring confirmation popover.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (critical action)
annotate srv.criticalAction with @(
    Common.IsActionCritical : true
);
```

STEP: Send message to UI (CAP JavaScript)
DESCRIPTION: Use req.notify() in CAP handler to send messages with severity 1 (toast). Higher severities produce dialogs.
LANGUAGE: JavaScript
CODE:
```js
// Example in CAP service handler
req.notify(`Critical action pressed`);
```

STEP: Configure table type & tree table (manifest + CDS)
DESCRIPTION: Set table type via manifest controlConfiguration @LineItem.tableSettings.type. For TreeTable: set type TreeTable, hierarchyQualifier and define @Aggregation.RecursiveHierarchy qualifier in CDS; add Hierarchy.RecursiveHierarchy columns and helper properties (LimitedDescendantCount, DrillState, etc.) and ensure they exist as columns for CAP.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (table type)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                    ...
                    "tableSettings": {
                        "type": "ResponsiveTable",
                        ...
                    },
                    ...
                },
                ...
            },
            ...
        }
    }
},
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (TreeTable settings)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                "/OrganizationalUnits/@com.sap.vocabularies.UI.v1.LineItem": {
                    "tableSettings": {
                        "type": "TreeTable",
                        "hierarchyQualifier": "OrgUnitsHierarchy"
                    }
                }
            },
            ...
        }
    }
}
```

LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (RecursiveHierarchy qualifier)
annotate srv.OrganizationalUnits @Aggregation.RecursiveHierarchy #OrgUnitsHierarchy : {
  ParentNavigationProperty : superOrdinateOrgUnit,
  NodeProperty             : ID,
};
```

LANGUAGE: CDS
CODE:
```cds
// Required CAP extensions for TreeTable (ensure fields exist)
extend srv.OrganizationalUnits with @(
  Hierarchy.RecursiveHierarchy #OrgUnitsHierarchy : {
    LimitedDescendantCount : LimitedDescendantCount,
    DistanceFromRoot       : DistanceFromRoot,
    DrillState             : DrillState,
    LimitedRank            : LimitedRank
  },
  Capabilities.FilterRestrictions.NonFilterableProperties: [
    'LimitedDescendantCount',
    'DistanceFromRoot',
    'DrillState',
    'LimitedRank'
  ],
  Capabilities.SortRestrictions.NonSortableProperties    : [
    'LimitedDescendantCount',
    'DistanceFromRoot',
    'DrillState',
    'LimitedRank'
  ],
) columns {
  null as LimitedDescendantCount : Int16,
  null as DistanceFromRoot       : Int16,
  null as DrillState             : String,
  null as LimitedRank            : Int16,
};
```

LANGUAGE: CDS
CODE:
```cds
// Optional hierarchy actions (move/copy)
annotate srv.OrganizationalUnits @(
    Hierarchy.RecursiveHierarchyActions #OrgUnitsHierarchy : {
        ChangeSiblingForRootsSupported,
        ChangeNextSiblingAction : 'LROPODataService.moveOrgUnit',
        CopyAction : 'LROPODataService.copyOrgUnit',
    },
);
```

STEP: Customize create button and isCreateEnabled hook (manifest + TypeScript)
DESCRIPTION: Configure creationMode.nodeType values in manifest and provide extension hook isCreateEnabled in extension controller to enable/disable create menu items depending on parent context.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (TreeTable creationMode)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
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
                                    "02": {
                                        "label": "Create a new division",
                                        "creationFields": "name,description,isActive"
                                    },
                                    "03": "Create a new business unit"
                                }
                            },
                            "isCreateEnabled": ".extension.sap.fe.showcase.lrop.ext.controller.RootEntityLRExtension.isCreateEnabled"
                        },
                        ...
                    }
                }
            },
            ...
        }
    }
}
```

LANGUAGE: TypeScript
CODE:
```ts
// app/listreport-objectpage/webapp/ext/controller/RootEntityLRExtension.controller.ts (isCreateEnabled)
export default class RootEntityLRExtension extends ControllerExtension<ExtensionAPI> {
    ...
    isCreateEnabled(value: String, parentContext?: Context) {
        switch (parentContext?.getProperty("category_code")) {
        case "03":
            return value === "02"; // Only Divisions under Business Units
        case "02":
            return value === "01"; // Only Departments under Divisions
        case "01":
            return false; // Nothing under Departments
        default:
            return value === "03"; // Only Business Units at root level
        }
    }
    ...
}
```

STEP: Multiple views (single table quickVariantSelection and multiple table views)
DESCRIPTION: Configure quickVariantSelection in manifest for segmented/dropdown switching of views in same table or define "views" with annotationPath keys for multiple-table mode with own tables and optional different entitySet per tab.
LANGUAGE: JSON
CODE:
```json
// Single table (quickVariantSelection)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                    ...
                    "tableSettings": {
                        ...
                        "quickVariantSelection": {
                            "paths": [
                                {
                                    "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant1"
                                },
                                {
                                    "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant2"
                                }
                            ],
                            "hideTableTitle": false,
                            "showCounts": true
                        }
                    },
                    ...
                },
                ...
            },
            ...
        }
    }
}
```

LANGUAGE: JSON
CODE:
```json
// Multiple table mode with tabs/views
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "views": {
                "paths": [
                    {
                        "key": "tab1",
                        "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant1"
                    },
                    {
                        "key": "tab2",
                        "annotationPath": "com.sap.vocabularies.UI.v1.SelectionPresentationVariant#SelectionPresentationVariant"
                    },
                    {
                        "key": "tab3",
                        "entitySet": "OrganizationalUnits",
                        "annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#activeOrgUnits"
                    }
                ],
                "showCounts": false
            },
            ...
        }
    }
}
```

STEP: SelectionVariant & SelectionPresentationVariant (CDS)
DESCRIPTION: Define UI.SelectionVariant and UI.SelectionPresentationVariant annotations in CDS to control filtering and presentation default options for views.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (SelectionVariant)
annotate srv.RootEntities with @(
    UI.SelectionVariant #variant1 : {
        Text : '{i18n>SVariant1}',
        SelectOptions : [
            {
                PropertyName : criticality_code,
                Ranges : [
                    {
                        Sign : #I,
                        High : 2,
                        Option : #BT,
                        Low : 0,
                    },
                ],
            },
        ],
    },
);
```

LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layout.cds (SelectionPresentationVariant)
annotate srv.RootEntities with @(
    UI.SelectionPresentationVariant #SelectionPresentationVariant : {
        Text : '{i18n>SelectionPresentationVariant}',
        SelectionVariant : {
            $Type : 'UI.SelectionVariantType',
            SelectOptions : [
                {
                    PropertyName : criticality_code,
                    Ranges : [
                        {
                            Sign : #I,
                            Option : #GT,
                            Low : 0,
                        },
                    ],
                },
            ],
        },
        PresentationVariant :{
            SortOrder : [
                {
                    Property : fieldWithPrice,
                    Descending : false,
                },
            ],
            Visualizations : [
                '@UI.LineItem#simplified',
            ],
        },
    },
);
```

STEP: Creation dialog via @Core.Immutable (CDS)
DESCRIPTION: Mark properties required during creation with @Core.Immutable so they display in creation dialog.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (creation)
annotate srv.RootEntities {
    ...
    stringProperty @Core.Immutable;
    ...
};
```

STEP: Default sort order (CDS)
DESCRIPTION: Use UI.PresentationVariant SortOrder to set default sort for a view; Visualizations defines target line items.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layout.cds (snippet)
annotate srv.RootEntities with @(
    UI.PresentationVariant :{
        SortOrder : [
            {
                Property : field,
                Descending : false,
            },
        ],
        Visualizations : [
            '@UI.LineItem',
        ],
    },
);
```

STEP: Table multiple selection (manifest)
DESCRIPTION: Configure table selectionMode in manifest.controlConfiguration.tableSettings to "Multi"/"Single"/"Auto"/"None".
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (selectionMode)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                    ...
                    "tableSettings": {
                        "type": "ResponsiveTable",
                        "selectionMode": "Multi",
                        ...
                    },
                    ...
                },
                ...
            },
            ...
        }
    }
},
```

STEP: Semantic key fields (CDS)
DESCRIPTION: Define semantic key grouping with Common.SemanticKey to highlight fields and display edit status.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (SemanticKey)
annotate srv.RootEntities with @(
    Common.SemanticKey : [ field ],
);
```

STEP: Highlight line items by criticality (CDS)
DESCRIPTION: Use @UI.Criticality inside @UI.LineItem to map criticality property for semantic coloring.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (LineItem criticality)
annotate srv.RootEntities with @(
    UI.LineItem.@UI.Criticality : criticality_code,
);
```

STEP: Add rating and progress indicators to table (CDS)
DESCRIPTION: Create UI.DataPoint annotations for Rating or Progress and reference them in @UI.LineItem as UI.DataFieldForAnnotation.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (rating)
annotate srv.RootEntities with @(
    UI.DataPoint #ratingIndicator : {
        Value : starsValue,
        TargetValue : 4,
        Visualization : #Rating,
        Title : '{i18n>ratingIndicator}',
        @Common.QuickInfo : 'Tooltip via Common.QuickInfo',
    },
);
annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
        {
            $Type : 'UI.DataFieldForAnnotation',
            Label : '{i18n>ratingIndicator}',
            Target : '@UI.DataPoint#ratingIndicator',
            @UI.Importance : #Low,
        },
        ...
    ],
);
```

LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (progress)
annotate srv.RootEntities with @(
    UI.DataPoint #progressIndicator : {
        Value : integerValue,
        TargetValue : 100,
        Visualization : #Progress,
        Title : '{i18n>progressIndicator}',
        //Criticality: criticality,
    },
);

annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
        {
            $Type : 'UI.DataFieldForAnnotation',
            Label : '{i18n>progressIndicator}',
            Target : '@UI.DataPoint#progressIndicator',
            @UI.Importance : #Low,
        },
        ...
    ],
);
```

STEP: Field tooltip via DataPoint (CDS)
DESCRIPTION: Workaround: create UI.DataPoint with @Common.QuickInfo and add as UI.DataFieldForAnnotation to display tooltip for a table field.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (tooltip)
annotate srv.RootEntities with @(
    UI.DataPoint #fieldWithTooltip : {
        Value : dimensions,
        @Common.QuickInfo : '{i18n>Tooltip}',
    },
);

annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
        {
            $Type : 'UI.DataFieldForAnnotation',
            Target : '@UI.DataPoint#fieldWithTooltip',
            Label : '{i18n>fieldWithToolTip}',
        },
        ...
    ],
);
```

STEP: Add Smart Micro Chart to table and charts (CDS)
DESCRIPTION: Create a UI.DataPoint and UI.Chart with ChartMeasureAttribute referencing the DataPoint; add to @UI.LineItem via UI.DataFieldForAnnotation or @UI.Chart facets in Object Page.
LANGUAGE: CDS
CODE:
```cds
// layouts_RootEntities.cds (radial micro chart)
annotate srv.RootEntities with @(
    UI.DataPoint #radialChart : { 
        Value : integerValue,
        TargetValue : targetValue,
        Criticality : criticality_code,
    },
);

annotate srv.RootEntities with @(
    UI.Chart #radialChart : {
        Title : '{i18n>radialChart}',
        Description : '{i18n>ThisIsAMicroChart}',
        ChartType : #Donut,
        Measures : [integerValue],
        MeasureAttributes : [{
                $Type : 'UI.ChartMeasureAttributeType',
                Measure : integerValue,
                Role : #Axis1,
                DataPoint : '@UI.DataPoint#radialChart',
        }]
    },
);

annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
        {
            $Type : 'UI.DataFieldForAnnotation',
            Target : '@UI.Chart#radialChart',
            Label   : '{i18n>radialChart}',
        },
        ...
    ],
);
```

STEP: Contact quick view in table (CDS)
DESCRIPTION: Annotate Contacts with Communication.Contact to build contact card and reference contact via DataFieldForAnnotation.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/labels.cds & layouts_RootEntities.cds (contact)
annotate srv.Contacts with @(
    Communication.Contact : {
        fn   : name, //full name
        kind : #org,
        tel  : [{
            uri  : phone,
            type : #preferred
        }],
        adr  : [{
            building : building,
            country  : country.name,
            street   : street,
            locality : city,
            code     : postCode,
            type     : #preferred
        }],
    }
);

annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
        {
            $Type : 'UI.DataFieldForAnnotation',
            Target : 'contact/@Communication.Contact',
            Label : '{i18n>contactQuickView}'
        },
        ...
    ],
);
```

STEP: Quick view facet (CDS)
DESCRIPTION: Annotate associated entity with UI.QuickViewFacets referencing UI.FieldGroup facets and add the association key as DataField in parent lineItem to enable quick view.
LANGUAGE: CDS
CODE:
```cds
// layouts_RootEntities.cds (FieldGroup, HeaderInfo, QuickViewFacets)
annotate srv.Orders with @(
    UI.FieldGroup #data : {
        Label : '{i18n>Order}',
        Data : [
            {Value : field2},
            {Value : integerProperty},
            {Value : field4},
        ],
    },
);

annotate srv.Orders with @(
    UI.HeaderInfo :{
        TypeName : '{i18n>Order}',
        TypeNamePlural : '{i18n>Order.typeNamePlural}',
        Title          : {
            $Type : 'UI.DataField',
            Value : '{i18n>Order}',
        },
        Description    : {
            $Type : 'UI.DataField',
            Value : field,
        },
        ImageUrl : '',
        TypeImageUrl : 'sap-icon://blank-tag',
    },
);

annotate srv.Orders with @(
    UI.QuickViewFacets : [
        {
            $Type : 'UI.ReferenceFacet',
            Target : '@UI.FieldGroup#data',
        }
    ],
);

annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
        {
            $Type : 'UI.DataField',
            Value : association2one_ID,
            Label : '{i18n>Order}',
            @UI.Importance : #High,
        },
        ...
    ],
);
```

STEP: Add multiple fields to one column (CDS)
DESCRIPTION: Define UI.FieldGroup and add it in @UI.LineItem as UI.DataFieldForAnnotation target to render multiple fields in a single responsive table column.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (multi-fields in one column)
annotate srv.RootEntities with @(
    UI.FieldGroup #AdminData       : {
        Data  : [
            {Value : createdAt},
            {Value : createdBy},
            {Value : modifiedAt},
            {Value : modifiedBy},
        ]
    },
    ...
);

annotate srv.RootEntities with @(
    UI.LineItem : [
        ...
        {
            $Type : 'UI.DataFieldForAnnotation',
            Target : '@UI.FieldGroup#AdminData', 
            Label : '{i18n>adminData}',
            @UI.Importance : #High,
        },
        ...
    ],
);
```

STEP: Add image URL column (CDS)
DESCRIPTION: Add normal DataField with image property that is annotated with @UI.IsImageURL to display image in first column.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds & labels.cds (image)
annotate srv.RootEntities with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : imageUrl,
            @UI.Importance : #High,
        },
        ...
    ],
);
```

LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/labels.cds (is image URL)
annotate srv.RootEntities {
    imageUrl @UI.IsImageURL;
}
```

STEP: Currency/UoM fields & custom unit scale (CDS)
DESCRIPTION: Annotate value property with @Measures.Unit or @Measures.ISOCurrency to link unit/ccy property. To customize fractional digits per unit, annotate CodeList UnitOfMeasures with @CodeList.UnitsOfMeasure and key property with @Common.UnitSpecificScale.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/labels.cds (unit/currency examples)
annotate srv.RootEntities {
    fieldWithUoM @Measures.Unit : uom_code;
    fieldWithCurrency @Measures.ISOCurrency : ccy_code;
}
```

LANGUAGE: CDS
CODE:
```cds
// Custom Units of Measure code list and entity
@CodeList.UnitsOfMeasure : {
    Url : './$metadata',
    CollectionPath : 'UnitOfMeasures',
}
service LROPODataService @(path : '/srv1') {
    …
    entity UnitOfMeasures as projection on persistence.UnitOfMeasures;
}

entity sap.common.UnitOfMeasures : CodeList {
  // Search-Term: #CustomUnitScale
    key code  : String(30) @Common.Text : descr @Common.UnitSpecificScale : scale @CodeList.ExternalCode : name;
    scale: Integer;
};
```

STEP: Add hyperlink column (CDS)
DESCRIPTION: Use UI.DataFieldWithUrl line item to add a link; annotate the visible text property with @HTML5.LinkTarget to control open behavior (e.g., _blank).
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (link)
@UI.LineItem : [
    {
        $Type               : 'UI.DataFieldWithUrl',
        Url                 : fieldWithURL, //Target, when pressing the text
        Value               : fieldWithURLtext, //Visible text
        Label               : '{i18n>dataFieldWithURL}',
        @UI.Importance   : #Medium,
    },
]
```

LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (link target)
annotate srv.RootEntities with {
    fieldWithURLtext @HTML5.LinkTarget : '_blank';
}
```

STEP: Add custom column via extension (fragment + manifest)
DESCRIPTION: Implement XML fragment for column template and register it under manifest controlConfiguration @LineItem.columns with "template" path. Use "properties" to enable sorting and "position" to anchor.
LANGUAGE: XML
CODE:
```xml
<!-- webapp/ext/CustomColumn-DateRangeLR.fragment.xml -->
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m">
        <Label text="{validFrom} - {validTo}"/>
</core:FragmentDefinition>
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (custom column registration)
"RootEntityListReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                    ...
                    "columns": {
                        "CustomColumn": {
                            "key": "customColumnLR",
                            "header": "{i18n>validityPeriodLR}",
                            "template": "sap.fe.showcase.lrop.ext.CustomColumn-DateRangeLR",
                            "availability": "Adaptation",
                            "horizontalAlign": "Center",
                            "width": "auto",
                            "properties": [
                                "validFrom",
                                "validTo"
                            ],
                            "position": {
                                "placement": "After",
                                "anchor": "DataField::fieldWithCriticality"
                            }
                        }
                    }
                },
                ...
            },
            ...
        }
    }
}
```

STEP: Object Page — communication, date/time, multiline, placeholders (CDS + manifest)
DESCRIPTION: Use annotations @Communication.IsEmailAddress / IsPhoneNumber; date/time types are inferred by type; use @UI.DateTimeStyle for display; @UI.MultiLineText for multiline; control lines display via manifest controlConfiguration; use @UI.Placeholder for input placeholders.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/labels.cds (communication)
annotate schema.RootEntities with{
    ...
    email                   @title : '{i18n>email}'                          @Communication.IsEmailAddress;
    telephone               @title : '{i18n>telephone}'                      @Communication.IsPhoneNumber;
    ...
};
```

LANGUAGE: CDS
CODE:
```cds
// CDS aspect for Date/Time types
aspect rootBasis : {
    ...
    validFrom   : Date;
    validTo     : DateTime;
    time        : Time;
    timeStamp   : Timestamp;
    ...
};
```

LANGUAGE: CDS
CODE:
```cds
// DateTime style (since UI5 1.129.0)
annotate srv.RootEntities with {
    validTo @UI.DateTimeStyle : 'short'
}
```

LANGUAGE: CDS
CODE:
```cds
// Multi line text
annotate schema.RootEntities with{
    ...
    description             @title : '{i18n>description}'                    @UI.MultiLineText;
    ...
};
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (multiline controlConfiguration formatOptions)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
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
},
```

LANGUAGE: CDS
CODE:
```cds
// Placeholder
annotate schema.RootEntities with {
    ...
    region @title : '{i18n>region}' @UI.Placeholder : 'Select a region';
    ...
};
```

STEP: Object Page header info and dynamic title (CDS)
DESCRIPTION: Use @UI.HeaderInfo to set TypeName/Title/Description/ImageUrl. Use OData concatenation expressions for dynamic header values.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (header info)
annotate srv.RootEntities with @(
    UI.HeaderInfo :{
        TypeName : '{i18n>RootEntities}',
        TypeNamePlural : '{i18n>RootEntities.typeNamePlural}',
        Title          : {
            $Type : 'UI.DataField',
            Value : field,
        },
        Description    : {
            $Type : 'UI.DataField',
            Value : '{i18n>RootEntities}',
        },
        ImageUrl : imageUrl,
        TypeImageUrl : 'sap-icon://sales-order',
    },
);
```

LANGUAGE: CDS
CODE:
```cds
// Dynamic concatenation using odata.concat and conditional with $If
annotate service.ChildEntities1 with @(
    UI.HeaderInfo : {
        ...
        Description     : {
            Value : ('Using odata.concat - Field: ' || field),
        },
        ...
    },
);
```

STEP: Header facets: field groups, contact, address, data points (CDS)
DESCRIPTION: Add header facets via @UI.HeaderFacets with ReferenceFacet/CollectionFacet. Use FieldGroup to package data fields; annotate contact/address/data points appropriately and reference them from header.
LANGUAGE: CDS
CODE:
```cds
// Header facets reference to field group or datapoint
annotate srv.RootEntities with @(
    UI.HeaderFacets : [
        {
            $Type : 'UI.ReferenceFacet',
            Target : '@UI.DataPoint#progressIndicator',
        },
        {
            $Type : 'UI.CollectionFacet',
            Facets : [
                ...
            ],
        },
    ],
);
```

LANGUAGE: CDS
CODE:
```cds
// Address facet / Communication.Address
annotate srv.RootEntities with @(
    UI.HeaderFacets : [
        {
            $Type : 'UI.ReferenceFacet',
            Target : 'contact/@Communication.Address',
            Label : '{i18n>Address}'
        },
    ],
);

annotate srv.Contacts with @(
    Communication.Address : {
        ...
        label : addressLabel,
        ...
    }
);
```

STEP: Header custom facet via manifest (fragment + manifest)
DESCRIPTION: Register a header custom facet template and optional edit template in manifest.header.facets. Use "stashed" to control initial visibility and "position.anchor" to place relative to other facets.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (custom header facet)
"childEntities1ObjectPage": {
    ...
    "options": {
        "settings": {
            ...
            "content": {
                "header": {
                    "facets": {
                        "CustomHeaderFacet": {
                            "template": "sap.fe.showcase.lrop.ext.CustomHeaderFacet-ProcessFlow",
                            "templateEdit" : "sap.fe.showcase.lrop.ext.CustomHeaderFacet-Edit",
                            "stashed": false,
                            "title": "{i18n>customHeaderFacet}",
                            "position": {
                                "placement": "After",
                                "anchor": "FacetWithPercent"
                            },
                            "flexSettings": {
                                "designtime": "not-adaptable-visibility"
                            }
                        }
                    }
                }
            }
        }
    }
},
```

STEP: Header facet navigation (in-page & external) (manifest + CDS)
DESCRIPTION: For in-page navigation set controlConfiguration DataPoint navigation.targetSections with sectionId/subSectionId constructed as appId--fe::FacetSection::ID. For external navigation, define sap.app.crossNavigation.outbounds then set controlConfiguration dataPoint navigation.targetOutbound referencing qualifier.
LANGUAGE: JSON
CODE:
```json
// In-page navigation example (manifest snippet)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                ...
                "@com.sap.vocabularies.UI.v1.DataPoint#progressIndicator":{
                    "navigation":{
                        "targetSections":{
                            "sectionId": "sap.fe.showcase.lrop::RootEntityObjectReport--fe::FacetSection::chartData",
                            "subSectionId": "sap.fe.showcase.lrop::RootEntityObjectReport--fe::FacetSubSection::advancedChartData"
                        }
                    }
                },
                ...
            },
            ...
        }
    }
},
```

LANGUAGE: CDS
CODE:
```cds
// App facets definition (CDS)
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
                    ID : 'advancedChartData',
                    ...
                },
            ],
        },
    ],
);
```

LANGUAGE: JSON
CODE:
```json
// External navigation outbound in app manifest
"sap.app": {
    ...
    "crossNavigation": {
        "outbounds": {
            "ExternalNavigation": {
                "semanticObject": "FeatureShowcaseOrder",
                "action": "manage"
            }
        }
    }
},
// Then controlConfiguration references:
"@com.sap.vocabularies.UI.v1.DataPoint#ratingIndicator":{
    "navigation":{
        "targetOutbound": {
            "outbound": "ExternalNavigation"
        }
    }
}
```

STEP: Toggle header editability (manifest)
DESCRIPTION: Use "editableHeaderContent": false in view options settings to make header non-editable in edit mode.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (disable header editable)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            "editableHeaderContent": false,
            ...
        }
    }
},
```

STEP: Add subpages / routing (manifest)
DESCRIPTION: Add a route pattern and a target component for a child entity Object Page. Configure navigation mapping in view options.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (route)
"routing": {
    "routes": [
        ...
        {
            "pattern": "RootEntities({key})/ChildEntities1({key2}):?query:",
            "name": "childEntities1ObjectPage",
            "target": "childEntities1ObjectPage"
        },
    ],
    "targets": {
        "childEntities1ObjectPage": {
            "type": "Component",
            "id": "childEntities1ObjectPage",
            "name": "sap.fe.templates.ObjectPage",
            "options": {
                "settings": {
                    "entitySet": "ChildEntities1",
                    ...
                }
            }
        },
    }
}
```

LANGUAGE: JSON
CODE:
```json
// Navigation mapping from parent to child (manifest snippet)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
            "navigation": {
                "childEntities1": {
                    "detail": {
                        "route": "childEntities1ObjectPage"
                    }
                },
                ...
            },
            ...
        }
    }
},
```

STEP: Show Related Apps button (manifest)
DESCRIPTION: Enable showRelatedApps true in view options settings to show "Related Apps" button in header action row (requires related apps with same semantic object).
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
            "showRelatedApps": true,
            ...
        }
    }
},
```

STEP: Object Page content facets & forms (CDS + manifest)
DESCRIPTION: Add facets via @UI.Facets using ReferenceFacet/CollectionFacet. Forms are UI.FieldGroup; add Data entries then reference the FieldGroup via ReferenceFacet. Use manifest settings "sectionLayout" to switch Tabs or Page layout.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (form FieldGroup)
annotate srv.RootEntities with @(
    UI.FieldGroup #ShowWhenInEdit       : {
        Data  : [
            {Value : field},
            {Value : fieldWithCriticality},
            {Value : fieldWithUoM},
            {Value : fieldWithPrice},
            {Value : criticality_code},
            {Value : contact_ID},
            {Value : association2one_ID},
        ]
    },
);
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (sectionLayout)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
            "sectionLayout": "Tabs",
            ...
        }
    }
},
```

STEP: Connected fields (CDS)
DESCRIPTION: Define UI.ConnectedFields that compose two data fields with a template string and reference it via UI.DataFieldForAnnotation in a FieldGroup.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (connected fields)
UI.ConnectedFields #ConnectedDates :{
    Label : '{i18n>ConnectedField}',
    Template : '{integerValue} / {targetValue}',
    Data : {
        integerValue : {
            $Type : 'UI.DataField',
            Value : integerValue,
        },
        targetValue : {
            $Type : 'UI.DataField',
            Value : targetValue,
        },
    },
},

annotate srv.RootEntities with @(
    UI.FieldGroup #Section : {
        Data  : [
            {
                $Type : 'UI.DataFieldForAnnotation',
                Target : '@UI.ConnectedFields#ConnectedDates',
            },
        ]
    },
);
```

STEP: Add custom content to forms (manifest)
DESCRIPTION: Register custom form field fragments under controlConfiguration referencing fieldgroup qualifier and position placement anchor; use template namespace path.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (CustomContentFieldGroup)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
            "controlConfiguration": {
                ...
                "@com.sap.vocabularies.UI.v1.FieldGroup#timeAndDate": {
                    "fields": {
                        "CustomContentFieldGroup": {
                            "label": "{i18n>validityPeriodOP}",
                            "template": "sap.fe.showcase.lrop.ext.CustomField-DatePicker",
                            "position": {
                                "placement": "Before",
                                "anchor": "DataField::validTo"
                            }
                        }
                    }
                },
                ...
            },
            ...
        }
    }
},
```

STEP: Form actions & inline actions in section (CDS + manifest)
DESCRIPTION: Add DataFieldForAction or DataFieldForIntentBasedNavigation to FieldGroup.Data to display actions in section toolbar. For inline actions, set Inline: true in CDS or "inline": true in manifest controlConfiguration for fieldgroup actions.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (form actions)
annotate srv.RootEntities with @(
    UI.FieldGroup #Section : {
        Data  : [
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
                        SemanticObjectProperty : 'integerProperty',
                    },
                ],
                @UI.Importance : #High,
            },
            {
                $Type : 'UI.DataFieldForAction',
                Action : 'LROPODataService.EntityContainer/unboundAction',
                Label : '{i18n>formActionEmphasized}',
                @UI.Emphasized   : true,
            },
            {
                $Type   : 'UI.DataFieldForAction',
                Action  : 'LROPODataService.changeProgress',
                Label   : '{i18n>formAction}',
                Inline  : true,
            },
        ]
    },
);
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (inline actions on fieldgroup)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
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
                },
            ...
            }
        }
    }
},
```

STEP: Object Page tables — enable variant, personalization, fullscreen, inline creation, export & actions (manifest)
DESCRIPTION: Configure tableSettings under controlConfiguration for the child entity @UI.LineItem: variantManagement, personalization, enableFullScreen, creationMode Inline/NewPage, enableExport, quickVariantSelection.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (table settings for childEntities1)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
            "variantManagement": "Control", // enable variant management for OP
            "controlConfiguration": {
                "childEntities1/@com.sap.vocabularies.UI.v1.LineItem": {
                    "tableSettings": {
                        "personalization": {
                            "column": true,
                            "sort": false,
                            "filter": true
                        },
                        "enableFullScreen": true,
                        "creationMode": {
                            "name": "Inline",
                            "createAtEnd": true
                        },
                        "enableExport": true,
                        "quickVariantSelection": {
                            "paths": [
                                {"annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant1"},
                                {"annotationPath": "com.sap.vocabularies.UI.v1.SelectionVariant#variant2"}
                            ],
                            "hideTableTitle": false,
                            "showCounts": true
                        }
                    },
                    "actions" : {
                        "CustomActionOPTableToolbar" : {
                            "press": "sap.fe.showcase.lrop.ext.CustomActions.messageBox",
                            "enabled": "{= %{deletePossible} === true}",
                            "visible" : true,
                            "text": "{i18n>CustomActionOPTableToolbar (enabled when delete enabled)}"
                        }
                    }
                },
                ...
            },
            ...
        }
    }
},
```

STEP: Chart section — prepare entity with aggregation (CDS)
DESCRIPTION: To add a full chart section, annotate the data source entity with Aggregation.ApplySupported, Analytics.AggregatedProperties, and define UI.Chart using aggregated measure names (not raw properties). Reference UI.Chart as a ReferenceFacet in @UI.Facets.
LANGUAGE: CDS
CODE:
```cds
// app/listreport-objectpage/layouts_RootEntities.cds (aggregation)
annotate srv.ChartDataEntities with @(
    Aggregation.ApplySupported : {
        GroupableProperties : [
            dimensions,
            criticality_code
        ],
        AggregatableProperties : [
            {
                Property : integerValue,
            },
        ],
    }
);

annotate service.ChartDataEntities with @(
    Analytics.AggregatedProperties : [
    {
        Name                 : 'minAmount',
        AggregationMethod    : 'min',
        AggregatableProperty : 'integerValue',
        @Common.Label     : 'Minimal Net Amount'
    },
    {
        Name                 : 'maxAmount',
        AggregationMethod    : 'max',
        AggregatableProperty : 'integerValue',
        @Common.Label     : 'Maximal Net Amount'
    },
    {
        Name                 : 'avgAmount',
        AggregationMethod    : 'average',
        AggregatableProperty : 'integerValue',
        @Common.Label     : 'Average Net Amount'
    }
    ],
);
```

LANGUAGE: CDS
CODE:
```cds
// Define UI.Chart and add to facets
annotate service.ChartDataEntities with @(
    UI.Chart : {
        Title : '{i18n>chart}',
        ChartType : #Column,
        Measures :  [maxAmount],
        Dimensions : [dimensions],
        MeasureAttributes   : [{
                $Type   : 'UI.ChartMeasureAttributeType',
                Measure : maxAmount,
                Role    : #Axis1
        }],
        DimensionAttributes : [
            {
                $Type     : 'UI.ChartDimensionAttributeType',
                Dimension : dimensions,
                Role      : #Category
            },
            {
                $Type     : 'UI.ChartDimensionAttributeType',
                Dimension : criticality_code,
                Role      : #Category
            },
        ],
        Actions : [
            {
                $Type : 'UI.DataFieldForAction',
                Action : 'LROPODataService.EntityContainer/unboundAction',
                Label : '{i18n>unboundAction}',
            },
        ]
    },
);

annotate srv.RootEntities with @(
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Target : 'chartEntities/@UI.Chart',
            Label : '{i18n>chart}'
        },
    ],
);
```

STEP: Custom section/subsection via manifest (fragment)
DESCRIPTION: Register custom section fragments in manifest content.body.sections and custom subsections in subSections referencing fragment template and set position anchor.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (custom section + custom subSection)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
            "content": {
                "body": {
                    "sections": {
                        "customSectionQualifier": {
                            "template": "sap.fe.showcase.lrop.ext.CustomSection",
                            "position": {
                                "anchor": "Section",
                                "placement": "After"
                            },
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
},
```

STEP: Footer determining actions and footer custom actions (CDS + manifest)
DESCRIPTION: Add DataFieldForAction entries with Determining : true in UI.Identification to render actions in footer. Use manifest.content.footer.actions to register custom footer actions and map press handlers.
LANGUAGE: CDS
CODE:
```cds
// Footer determining action in CDS
annotate srv.RootEntities with @(
    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'LROPODataService.changeCriticality',
            Label : '{i18n>changeCriticality}',
            Determining : true,
            Criticality : criticality_code,
        },
    ],
);
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (custom footer action)
"RootEntityObjectReport": {
    ...
    "options": {
        "settings": {
            ...
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
},
```

STEP: Custom Object Page (manifest — custom component)
DESCRIPTION: Replace sub-entity object page with custom view: add target with type Component name "sap.fe.core.fpm" and viewName pointing to custom XML view; add route pattern to target. Use Building Blocks for consistency.
LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (custom OP target)
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
```

LANGUAGE: JSON
CODE:
```json
// app/listreport-objectpage/webapp/manifest.json (routing entry)
{
    "pattern": "RootEntities({key})/childEntities3({key2}):?query:",
    "name": "CustomObjectPage_childEntities3",
    "target": "CustomObjectPage_childEntities3"
}
```

STEP: Worklist floorplan — hide filter bar (manifest)
DESCRIPTION: For Worklist floorplan (List Report flavor) disable the filter bar with hideFilterBar true in view settings.
LANGUAGE: JSON
CODE:
```json
// app/worklist/webapp/manifest.json (Worklist)
"OrdersList": {
    ...
    "options": {
        "settings": {
            ...
            "hideFilterBar": true
        }
    }
}
```

STEP: Where to find code & support
DESCRIPTION: Search terms are included in each section. File paths referenced throughout:
- app/listreport-objectpage/webapp/manifest.json
- app/listreport-objectpage/field-control.cds
- app/listreport-objectpage/layout.cds
- app/listreport-objectpage/layouts_RootEntities.cds
- app/listreport-objectpage/value-helps.cds
- app/listreport-objectpage/labels.cds
- app/listreport-objectpage/ext/controller/RootEntityLRExtension.controller.ts
- srv/list-report-srv.js
- app/worklist/webapp/manifest.json

LANGUAGE: Text
CODE:
```text
Support:
- Create an issue: https://github.com/SAP-samples/fiori-elements-feature-showcase/issues
- SAP Community: https://answers.sap.com/questions/ask.html
License: Apache-2.0 (see LICENSES/Apache-2.0.txt)
```

--------------------------------
