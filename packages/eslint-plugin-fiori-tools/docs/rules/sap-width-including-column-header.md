# Require `widthIncludingColumnHeader` for Small Tables (`sap-width-including-column-header`)

Ensures that small tables (less than dix columns) include the `widthIncludingColumnHeader` property set to `true` for improved calculation of the column width.

## Rule Details

This rule checks if the `widthIncludingColumnHeader` property is set to `true` for small tables (less than six columns) in the `manifest.json` file. This property ensures that the column width calculation includes the column header, improving the table's appearance and usability.

If the `widthIncludingColumnHeader` property is missing or not set to `true` for small tables, the rule reports a warning.

### Why Was This Rule Introduced?

By default, the column width is calculated based on the type of the content. Including the column header in the width calculation ensures better alignment and readability, especially for small tables.

### Warning Message

The following patterns are considered warnings:

#### Missing `widthIncludingColumnHeader` in the `manifest.json` File

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "IncidentsList": {
          "options": {
            "settings": {
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {}
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

#### Missing `widthIncludingColumnHeader` in Annotations

```xml
<Annotations Target="IncidentService.IncidentFlow">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="identifier" />
            </Record>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="title" />
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

The following patterns are not considered warnings:

#### Correct Manifest File

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "IncidentsList": {
          "options": {
            "settings": {
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "widthIncludingColumnHeader": true
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

#### Correct Annotations

```xml
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.LineItem">
         <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="identifier" />
            </Record>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="title" />
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

## How to Fix

To fix the warning, ensure that the `widthIncludingColumnHeader` property is added to the `tableSettings` section in the `manifest.json` file or annotations and set to `true`. For example:

- `manifes.json`:

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "IncidentsList": {
          "options": {
            "settings": {
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "widthIncludingColumnHeader": true
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

- Annotations:

```xml
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="identifier" />
            </Record>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="title" />
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 Table Settings Documentation](https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412)

## Release Information
This rule was introduced to ensure better column width calculation for small tables in UI5 applications.