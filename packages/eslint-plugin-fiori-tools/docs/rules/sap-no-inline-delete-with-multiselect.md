# `inlineDelete` and `multiSelect` cannot both be enabled in table settings (`sap-no-inline-delete-with-multiselect`)

The `inlineDelete` and `multiSelect` properties in `component.settings.tableSettings` are mutually exclusive in SAP Fiori elements OData V2 applications. Enabling both simultaneously causes the application to fail to load. This rule detects the conflict at design time so developers can fix it before deployment.

The rule applies to all V2 page types:

- **List report / Analytical list page** — checks `component.settings.tableSettings`
- **Object page** — checks both `component.settings.tableSettings` (applied to all section tables) and per-section `component.settings.sections.<sectionKey>.tableSettings`

## Rule Details

When both `inlineDelete: true` and `multiSelect: true` are found in the same `tableSettings` block, the rule emits a warning.

##### Warning Message: "inlineDelete" and "multiSelect" cannot both be enabled in the same table settings. The application will fail to load.

The following patterns are considered warnings:

**List report — `tableSettings` level:**

```json
{
  "sap.ui.generic.app": {
    "pages": {
      "ListReport|SalesOrder": {
        "entitySet": "SalesOrder",
        "component": {
          "name": "sap.suite.ui.generic.template.ListReport",
          "settings": {
            "tableSettings": {
              "inlineDelete": true,
              "multiSelect": true
            }
          }
        }
      }
    }
  }
}
```

**Object page — page-level `tableSettings` (applies to all section tables):**

```json
{
  "sap.ui.generic.app": {
    "pages": {
      "ListReport|SalesOrder": {
        "pages": {
          "ObjectPage|SalesOrder": {
            "entitySet": "SalesOrder",
            "component": {
              "name": "sap.suite.ui.generic.template.ObjectPage",
              "settings": {
                "tableSettings": {
                  "inlineDelete": true,
                  "multiSelect": true
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

**Object page — section-level `tableSettings`:**

```json
{
  "component": {
    "settings": {
      "sections": {
        "SalesOrderItems": {
          "tableSettings": {
            "inlineDelete": true,
            "multiSelect": true
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
  "component": {
    "settings": {
      "tableSettings": {
        "inlineDelete": true,
        "multiSelect": false
      }
    }
  }
}
```

```json
{
  "component": {
    "settings": {
      "tableSettings": {
        "multiSelect": true
      }
    }
  }
}
```

### How to Fix

Disable one of the two conflicting properties. If row-level delete actions are needed, keep `inlineDelete: true` and remove or set `multiSelect: false`. If multi-row selection is needed, keep `multiSelect: true` and remove or set `inlineDelete: false`.

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
