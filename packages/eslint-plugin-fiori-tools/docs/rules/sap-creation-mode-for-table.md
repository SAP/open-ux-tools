# Ensure the Correct `creationMode` Configuration for Tables in SAP Fiori Elements for OData V2 and V4 Applications (`sap-creation-mode-for-table`)

Validates that table creation mode (`createMode` in OData V2 and `creationMode` in OData V4) is correctly configured to ensure an optimal user experience when creating new table entries.

## Rule Details

This rule validates the configuration of creation mode for tables in SAP Fiori elements applications. Creation mode determines how users can add new entries to a table, which impacts the overall user experience.

The rule performs different validations depending on the SAP Fiori elements version:


### For OData V2 Applications

- Validates `createMode` at three levels with cascading priority: section level → page level → application level.
- Recommends `creationRows` as the best practice value for an optimal user experience.
- Warns if analytical tables have `createMode` configured. Creation mode is not supported for analytical tables.
- Suggests adding `createMode` at the application level, if it is not configured at any level.

### For OData V4 Applications

- Validates `creationMode` at two levels: page level → application level.
- Recommends `InlineCreationRows` for responsive Tables and grid tables.
- Recommends `Inline` for tree tables.
- Warns if analytical tables have `creationMode` configured. Vreation mode is not supported for analytical tables.
- Suggests adding `creationMode` at the application level, if not configured.


### Invalid `createMode` Value in OData V2

#### Section Level

The following patterns are considered warnings:

```json
{
  "sap.ui.generic.app": {
    "pages": [{
      "pages": [{
        "component": {
          "settings": {
            "sections": {
              "SalesOrderItems": {
                "createMode": "badValue"
              }
            }
          }
        }
      }]
    }]
  }
}
```

The following patterns are not considered warnings:

```json
{
  "sap.ui.generic.app": {
    "pages": [{
      "pages": [{
        "component": {
          "settings": {
            "sections": {
              "SalesOrderItems": {
                "createMode": "creationRows"
              }
            }
          }
        }
      }]
    }]
  }
}
```

#### Page Level

The following patterns are considered warnings:

```json
{
  "sap.ui.generic.app": {
    "pages": [{
      "pages": [{
        "component": {
          "settings": {
            "createMode": "badValue"
          }
        }
      }]
    }]
  }
}
```

The following patterns are not considered warnings:

```json
{
  "sap.ui.generic.app": {
    "pages": [{
      "pages": [{
        "component": {
          "settings": {
            "createMode": "creationRows"
          }
        }
      }]
    }]
  }
}
```

#### Application Level

The following patterns are considered warnings:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "tableSettings": {
        "createMode": "external"
      }
    }
  }
}
```

The following patterns are not considered warnings:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "tableSettings": {
        "createMode": "creationRows"
      }
    }
  }
}
```

### Invalid `creationMode` Value in OData V4

#### Page Level

The following patterns are considered warnings:

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "IncidentsObjectPage": {
          "options": {
            "settings": {
              "controlConfiguration": {
                "incidentFlow/@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "type": "ResponsiveTable",
                    "creationMode": {
                      "name": "InvalidMode"
                    }
                  }
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

The following patterns are not considered warnings:

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "IncidentsObjectPage": {
          "options": {
            "settings": {
              "controlConfiguration": {
                "incidentFlow/@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "type": "ResponsiveTable",
                    "creationMode": {
                      "name": "InlineCreationRows"
                    }
                  }
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

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "IncidentsObjectPage": {
          "options": {
            "settings": {
              "controlConfiguration": {
                "incidentFlow/@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "type": "TreeTable",
                    "creationMode": {
                      "name": "Inline"
                    }
                  }
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

#### Application Level

The following patterns are considered warnings:

```json
  "sap.fe": {
    "macros": {
      "table": {
        "defaultCreationMode": "InValidMode"
      }
    }
  },
```

The following patterns are not considered warnings:

```json
  "sap.fe": {
    "macros": {
      "table": {
        "defaultCreationMode": "InlineCreationRows"
      }
    }
  },
```


#### Analytical Table with Creation Mode (OData V2 and OData V4)


Analytical tables do not support creation mode. If you configure `createMode` (OData V2) or `creationMode` (OData V4) for an analytical table, this warning is triggered.

The following patterns are considered warnings:

**OData V2:**

```json
{
  "sap.ui.generic.app": {
    "pages": [{
      "pages": [{
        "component": {
          "settings": {
            "sections": {
              "SalesOrderItems": {
                "tableSettings": {
                  "type": "AnalyticalTable"
                },
                "createMode": "creationRows"
              }
            }
          }
        }
      }]
    }]
  }
}
```

**OData V4:**

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "IncidentsObjectPage": {
          "options": {
            "settings": {
              "controlConfiguration": {
                "incidentFlow/@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "type": "AnalyticalTable",
                    "creationMode": {
                      "name": "NewPage"
                    }
                  }
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

#### Missing Creation Mode Configuration (OData V2 and OData V4)

When a creation mode is not configured at any level (section, page, or application for OData and page or application for OData V4), the rule suggests adding it at the application level. This ensures a consistent user experience across all tables in the application.

## How to Fix

### For OData V2 Applications

1. **Use `creationRows` as the recommended value** - This provides the best user experience for creating table entries.
2. **Configure at the application level** to ensure consistency across all tables:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "tableSettings": {
        "createMode": "creationRows"
      }
    }
  }
}
```

3. **Remove `createMode` from analytical tables**: They don't support creation mode.

```json
{
  "sap.ui.generic.app": {
    "pages": [{
      "pages": [{
        "component": {
          "settings": {
            "sections": {
              "SalesOrderItems": {
                "tableSettings": {
                  "type": "AnalyticalTable"
                }
                // Remove "createMode" property
              }
            }
          }
        }
      }]
    }]
  }
}
```

### For OData V4 Applications

1. **Use the appropriate recommended value based on the table type:**
   - `InlineCreationRows` for responsive tables and grid tables.
   - `Inline` for tree tables.

2. **Configure at the application level** for consistency:

```json
{
  "sap.fe": {
    "macros": {
      "table": {
        "defaultCreationMode": "InlineCreationRows"
      }
    }
  }
}
```

3. **Remove `creationMode` from analytical tables**: They don't support creation mode.

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "IncidentsObjectPage": {
          "options": {
            "settings": {
              "controlConfiguration": {
                "incidentFlow/@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "type": "AnalyticalTable"
                    // Remove `creationMode` property
                  }
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

## Bug Report

If you detect an issue with the rules, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Creation Mode Options in SAP Fiori Elements](https://sapui5.hana.ondemand.com/sdk/#/topic/cfb04f0c58e7409992feb4c91aa9410b)
