# Detect Some Forbidden Usages of Browser APIs (`sap-browser-api-error`)

This is a collection of usages of browser APIs that may lead to issues.
Please search for the warning messages that you see in ESLint to find the explanation of the respective check.

## Rule Details

This rule aims to detect forbidden usages of browser APIs and raise an error.

### Direct DOM insertion

**Warning message**: "Direct DOM insertion, create a custom control instead"

The following patterns are considered warnings:

```js
document.createElement(foo);
```

### Direct DOM Manipulation

**Warning message**: "Direct DOM Manipulation, better to use `jQuery.appendTo` if really needed"

The following patterns are considered warnings:

```js
document.execCommand(cmd, false, args);
```

### `insertBrOnReturn`

**Warning message**: "`insertBrOnReturn` is not allowed since it is a Mozilla specific method, Chrome doesn't support that."

The following patterns are considered warnings:

```js
var abc = document.queryCommandSupported('insertBrOnReturn');
```

### Location Reload

**Warning message**: "`location.reload()` is not permitted."

The following patterns are considered warnings:

```js
location.reload();
var mylocation = location;
mylocation.reload();
```

### Override of Global Event Handling

**Warning message**: "Global event handling override is not permitted, please modify only single events."

The following patterns are considered warnings:

```js
window.event.returnValue = false;
window.onload = function () {
  return Hammer;
};
```

### Access to Proprietary Browser APIs

Some browser APIs should not be used at all, instead the `sap.ui.Device` API must be used.

**Warning message**: "Proprietary Browser API access, use `sap.ui.Device` API instead."

The following patterns are considered warnings:

```js
if (window.addEventListener) {
  x = 1;
}
navigator.back();
var x = navigator.appCodeName;
```

### Definition of Globals using the `window` Object

**Warning message**: "Definition of a global variable or api in the `window` object is not permitted."

The following patterns are considered warnings:

```js
var mynavig = window.top.tip;
window.define();
```

### Dynamic Style Insertion

**Warning message**: "Dynamic style insertion, use library CSS or lessifier instead."

The following patterns are considered warnings:

```js
var sheet = document.styleSheets[i];
var abc = document.styleSheets.length;
```

## False positives

If the check produces a false positive, that is, you receive a warning but your code is correct and complies to the SAPUI5 guidelines, you can be deactivate the rule by placing the following pseudo-comment block around your code, as shown in the following sample code:

```js

/*eslint-disable sap-browser-api-error*/
   <your code>
/*eslint-enable sap-browser-api-error*/

```

## Bug report

In case you detect an issue with the check please open a Github issue [here](https://github.tools.sap/FIORI-PIPELINE/fioriPipelinesGo/issues).

## Further Reading

[SAPUI5 Coding Guidelines](http://veui5infra.dhcp.wdf.sap.corp:8080/demokit/#docs/guide/030fcd14963048218488048f407f8f34.html)
