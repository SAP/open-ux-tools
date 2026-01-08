# Global variables shall not be used in SAP Fiori applications (sap-no-global-variable)

## Rule Details

The rule checks if a variable is declared as global (defined outside of any function scope) and returns an error message in this case.

ALLOWED_VARIABLES = [ "undefined", "NaN", "arguments", "PDFJS", "console", "Infinity" ]

## Bug Report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
