# Discourage usage of setTimeout (sap-timeout-usage)

This rule finds calls to the setTimeout method with a timeout greater than 0.

## Rule details

Executing logic with timeouts is often a workaround for faulty behavior and does not fix the root cause.
The timing that works for you may not work under different circumstances (other geographical locations with greater network latency, or other devices that have slower processors) or when the code is changed.
Use callbacks or events instead, if available. Please check the SAPUI5 guidelines for more details.

### warning message: Timeout with value > 0

The following patterns are considered warnings:

```js
window.setTimeout(jQuery.proxy(processChanges, this), 50);
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further reading

