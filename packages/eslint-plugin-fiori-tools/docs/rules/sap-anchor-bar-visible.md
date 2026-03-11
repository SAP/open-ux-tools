# Disallow Setting `anchorBarVisible` to `false` in Object Page Headers (`sap-anchor-bar-visible`)

Ensures that the `anchorBarVisible` property is not set to `false` in the object page header configuration in the `manifest.json` file.

## Rule Details

This rule checks if the `anchorBarVisible` property is set to `false` in the object page header configuration within the `manifest.json` file. We recommend that you don't set this property to `false`, as it impacts the user experience and navigation within object pages.

### Why Was This Rule Introduced?

The anchor bar is an important navigation feature in object pages that enables users to quickly jump between different sections. Setting `anchorBarVisible` to `false` in the `manifest.json` file can negatively impact user experience. This rule ensures the correct configuration of object page headers.

### Warning Message

The following patterns are considered warnings:

#### Incorrect Manifest Configuration

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "MyObjectPage": {
          "options": {
            "settings": {
              "content": {
                "header": {
                  "anchorBarVisible": false
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

The `anchorBarVisible` property is set to `false`, which is not recommended.

The following patterns are considered correct:

#### Correct Manifest Configuration (Property Set to `true`)

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "MyObjectPage": {
          "options": {
            "settings": {
              "content": {
                "header": {
                  "anchorBarVisible": true
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

The `anchorBarVisible` property is set to `true`, which is the recommended setting.

#### Correct Manifest Configuration (Property Not Set)

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "MyObjectPage": {
          "options": {
            "settings": {
              "content": {
                "header": {}
              }
            }
          }
        }
      }
    }
  }
}
```

The `anchorBarVisible` property is not configured, which is also acceptable.

#### Correct Manifest Configuration (Form Entry Object Page)

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "FormEntryObjectPage": {
          "options": {
            "settings": {
              "content": {
                "header": {
                  "visible": false,
                  "anchorBarVisible": false
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

Form entry object pages are allowed to have both `visible: false` and `anchorBarVisible: false`, as this is the recommended pattern for data entry pages.

## How to Fix

To fix the warning, either remove the `anchorBarVisible` property entirely or set it to `true`. The rule provides an automatic fix that removes the property when it's set to `false`.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 Form Entry Object Page](https://ui5.sap.com/#/topic/533f7e7f59854cb08ce8074814ae83c5)
