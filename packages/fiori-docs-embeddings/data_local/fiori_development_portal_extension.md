
--------------------------------

**TITLE**: Analytical chart on List Page Fiori Elements Odata V4

**INTRODUCTION**: The analytical chart on list page offers a unique way to analyze data step by step from different perspectives, to investigate a root cause through drilldown, and to act on transactional content.
In SAP Fiori elements for OData V4, the ALP (Analytical List Report) is not a separate floorplan, but rather a 'flavor' of the list report. When application developers configure a list report template, they can decide to create the template using the 'ALP flavor'. Application developers must then add the "views" configuration as shown in the following manifest.json sample below.


**TAGS**: analytical list page, analytics, charts, insights, ALP, analytical table, ApplySupported, Aggregation, Analytics.AggregatedProperty, UI.chart

**STEP**: Configure the manifest.json

**DESCRIPTION**: 
The primary annotation path can be either UI.Chart, UI.PresentationVariant, or UI.SelectionPresentationVariant. If you specify a UI.PresentationVariant or UI.SelectionPresentationVariant, SAP Fiori elements picks the first chart visualization and renders it. If the primary annotation path leads to a PresentationVariant that has no chart visualization, SAP Fiori elements looks for the default chart (Ui.Chart without a qualifier) and renders it. If the default chart is not found, SAP Fiori elements renders a blank chart.
Adding a chart to the list report requires the service to include the `@Aggregation.ApplySupported` annotation.

Tip

If the specified primary or secondary annotationPath is not found, there is no fallback and the application will fail to load.

The secondary annotation path can be either UI.LineItem, UI.PresentationVariant, or UI.SelectionPresentationVariant. If you specify UI.PresentationVariant or UI.SelectionPresentationVariant, SAP Fiori elements picks the first LineItem visualization and renders it. If the secondary annotation path leads to a PresentationVariant that has no table visualization, SAP Fiori elements looks for the default table (UI.LineItem w/o qualifier) and renders it. If the default table is not found, SAP Fiori elements renders a blank table.

"defaultPath" can be "primary", "secondary", or "both". If it is "primary", SAP Fiori elements loads the app in chart-only view. If it is "secondary", SAP Fiori elements loads the app in table-only view. If 'defaultPath' is "both", SAP Fiori elements loads the list page in hybrid view showing both the chart and the list.

Note

Do not use arrays for the "paths", "primary" and "secondary" properties even though they are provided in the manifest, because SAP Fiori elements currently does not support this.

**LANGUAGE**: JSON

**CODE**:
```JSON
              "views": {
                "paths": [
                  {
                    "primary": [
                      {
                        "annotationPath": "com.sap.vocabularies.UI.v1.Chart#alpChart"
                      }
                    ],
                    "secondary": [
                      {
                        "annotationPath": "com.sap.vocabularies.UI.v1.LineItem"
                      }
                    ],
                    "defaultPath": "both"
                  }
                ]
```


**ADDITIONAL RELATED CODE BLOCKS**:

**FILE**: manifest.json

**LANGUAGE**: manifest.json

**CODE**:
```JSON
{
  .....
  "sap.ui5": {
    "flexEnabled": true,
    "dependencies": {
      "minUI5Version": "1.136.7",
      "libs": {
        "sap.m": {},
        "sap.ui.core": {},
        "sap.fe.templates": {}
      }
    },
    "contentDensities": {
      "compact": true,
      "cozy": true
    },
    "models": {
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": {
          "bundleName": "com.sap.travel.travelmanagementapp.i18n.i18n"
        }
      },
      "": {
        "dataSource": "mainService",
        "preload": true,
        "settings": {
          "operationMode": "Server",
          "autoExpandSelect": true,
          "earlyRequests": true
        }
      },
      "@i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "uri": "i18n/i18n.properties"
      }
    },
    "resources": {
      "css": []
    },
    "routing": {
      "config": {},
      "routes": [
        {
          "pattern": ":?query:",
          "name": "TravelsList",
          "target": "TravelsList"
        },
        {
          "pattern": "Travels({key}):?query:",
          "name": "TravelsObjectPage",
          "target": "TravelsObjectPage"
        },
        {
          "pattern": "Travels({key})/toBookings({key2}):?query:",
          "name": "BookingsObjectPage",
          "target": "BookingsObjectPage"
        }
      ],
      "targets": {
        "TravelsList": {
          "type": "Component",
          "id": "TravelsList",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": {
              "contextPath": "/Travels",
              "variantManagement": "Page",
              "initialLoad": "Enabled",
              "navigation": {
                "Travels": {
                  "detail": {
                    "route": "TravelsObjectPage"
                  }
                }
              },
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "type": "ResponsiveTable"
                  }
                }
              },
              "views": {
                "paths": [
                  {
                    "primary": [
                      {
                        "annotationPath": "com.sap.vocabularies.UI.v1.Chart#alpChart"
                      }
                    ],
                    "secondary": [
                      {
                        "annotationPath": "com.sap.vocabularies.UI.v1.LineItem"
                      }
                    ],
                    "defaultPath": "both"
                  }
                ]
              }
            }
          }
        },
        "TravelsObjectPage": {
          "type": "Component",
          "id": "TravelsObjectPage",
          "name": "sap.fe.templates.ObjectPage",
          "options": {
            "settings": {
              "editableHeaderContent": false,
              "contextPath": "/Travels",
              "navigation": {
                "toBookings": {
                  "detail": {
                    "route": "BookingsObjectPage"
                  }
                }
              },
              "content": {
                "body": {
                  "sections": {
                    "TravelNotesSection": {
                      "template": "com.sap.travel.travelmanagementapp.ext.fragment.TravelNotesSection",
                      "position": {
                        "placement": "After",
                        "anchor": "GeneralInfoSection"
                      },
                      "title": "Travel Notes"
                    }
                  }
                }
              }
            }
          }
        },
        "BookingsObjectPage": {
          "type": "Component",
          "id": "BookingsObjectPage",
          "name": "sap.fe.templates.ObjectPage",
          "options": {
            "settings": {
              "editableHeaderContent": false,
              "contextPath": "/Travels/toBookings"
            }
          }
        }
      }
    }
  },
  "sap.fiori": {
    "registrationIds": [],
    "archeType": "transactional"
  }
}


```



**FILE**: annotations.cds

**LANGUAGE**: cds

**CODE**:
```cds
 Analytics.AggregatedProperty #TotalPrice_average : {
        $Type : 'Analytics.AggregatedPropertyType',
        Name : 'TotalPrice_average',
        AggregatableProperty : TotalPrice,
        AggregationMethod : 'average',
        @Common.Label : 'TotalPrice (Average)',
    },
    UI.Chart #alpChart : {
        $Type : 'UI.ChartDefinitionType',
        ChartType : #Column,
        Dimensions : [
            Destination,
        ],
        DynamicMeasures : [
            '@Analytics.AggregatedProperty#TotalPrice_average',
        ],
    },
```


**FILE**: service.cds

**LANGUAGE**: cds

**CODE**:
```cds
  @Aggregation.ApplySupported : {
    $Type : 'Aggregation.ApplySupportedType',
    AggregatableProperties : [
      { $Type : 'Aggregation.AggregatablePropertyType', Property : ReservationFee },
      { $Type : 'Aggregation.AggregatablePropertyType', Property : TotalPrice }
    ],
    GroupableProperties : [
      TravelStatus,
      toAgency_ID,
      toCustomer_ID,
      Destination,
      StartDate,
      EndDate
    ]
  }
```
--------------------------------