# Ensure proper creationMode configuration for tables in SAP Fiori Elements V2 and V4 applications (`sap-creation-mode-for-table`)

Validates that table creation mode (`createMode` in V2, `creationMode` in V4) is properly configured to ensure optimal user experience when creating new table entries.

## Rule Details

This rule validates the configuration of creation mode for tables in SAP Fiori Elements applications. Creation mode determines how users can add new entries to a table, impacting the overall user experience.

The rule performs different validations depending on the Fiori Elements version:


### For V2 Applications

- Validates `createMode` at three levels with cascading priority: section level → page level → application level
- Recommends `creationRows` as the best practice value for optimal user experience
- Warns if analytical tables have `createMode` configured (creation mode is not supported for analytical tables)
- Suggests adding `createMode` at application level if not configured at any level

### For V4 Applications

- Validates `creationMode` at two levels: page level → application level
- Recommends `InlineCreationRows` for Responsive Tables and Grid Tables
- Recommends `Inline` for Tree Tables
- Warns if analytical tables have `creationMode` configured (creation mode is not supported for analytical tables)
- Suggests adding `creationMode` at application level if not configured

**Note**: If mixed mode of table types e.g. `ResponsiveTable` and `TreeTable` is configured, diagnostic is reported on page level.

### Invalid createMode value in V2 (Fiori Elements V2)

#### Section level

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

#### Page level

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

#### Application level

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

### Invalid creationMode value in V4 (Fiori Elements V4)

#### Page level

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

#### Application level

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


#### Analytical table with creation mode (V2 and V4)


Analytical tables do not support creation mode. If you configure `createMode` (V2) or `creationMode` (V4) for an analytical table, this warning will be triggered.

The following patterns are considered warnings:

**V2 Example:**

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

**V4 Example:**

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

#### Missing creation mode configuration (V2 and V4)

When no creation mode is configured at any level (section/page/application for V2, or page/application for V4), the rule suggests adding it at the application level. This ensures a consistent user experience across all tables in the application.

## How to Fix

### For V2 Applications

1. **Use `creationRows` as the recommended value** - This provides the best user experience for creating table entries
2. **Configure at application level** to ensure consistency across all tables:

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

3. **Remove `createMode` from analytical tables** - They don't support creation mode:

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

### For V4 Applications

1. **Use the appropriate recommended value based on table type:**
   - `InlineCreationRows` for Responsive Tables and Grid Tables
   - `Inline` for Tree Tables

2. **Configure at application level** for consistency:

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

3. **Remove `creationMode` from analytical tables** - They don't support creation mode:

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
                    // Remove "creationMode" property
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

In case you detect an issue with the check, please open a GitHub issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Creation Mode Options in Fiori Elements](https://sapui5.hana.ondemand.com/sdk/#/topic/cfb04f0c58e7409992feb4c91aa9410b)
