# Detect some forbidden usages of browser APIs (sap-browser-api-error)

This is a collection of usages of browser APIs that might lead to issues.
Please search for the warning messages that you see in ESLint to find the explanation of the respective check.

## Rule Details

This rule aims to detect forbidden usages of browser APIs and raise error.

#### Direct DOM insertion

Warning message: _Direct DOM insertion, create a custom control instead_

The following patterns are considered warnings:

```js
document.createElement(foo);
```

#### Direct DOM manipulation

Warning message: _Direct DOM Manipulation, better to use `jQuery.appendTo` if really needed_

The following patterns are considered warnings:

```js
document.execCommand(cmd, false, args);
```

#### insertBrOnReturn

Warning message: _`insertBrOnReturn` is not allowed since it is a Mozilla specific method, Chrome doesn't support that._

The following patterns are considered warnings:

```js
var abc = document.queryCommandSupported('insertBrOnReturn');
```

#### Location reload

Warning message: _location.reload() is not permitted._

The following patterns are considered warnings:

```js
location.reload();
var mylocation = location;
mylocation.reload();
```

#### Global event handling override

Warning message: _Global event handling override is not permitted, please modify only single events._

The following patterns are considered warnings:

```js
window.event.returnValue = false;
window.onload = function () {
  return Hammer;
};
```

#### Proprietary Browser API access

Some browser APIs should not be used at all, instead the sap.ui.Device API has to be used.

Warning message: _Proprietary Browser API access, use `sap.ui.Device` API instead._

The following patterns are considered warnings:

```js
if (window.addEventListener) {
  x = 1;
}
navigator.back();
var x = navigator.appCodeName;
```

#### Definition of globals via window object

Warning message: _Definition of global variable/api in `window` object is not permitted._

The following patterns are considered warnings:

```js
var mynavig = window.top.tip;
window.define();
```

#### Dynamic style insertion

Warning message: _Dynamic style insertion, use library CSS or lessifier instead._

The following patterns are considered warnings:

```js
var sheet = document.styleSheets[i];
var abc = document.styleSheets.length;
```

## False positives

There might be cases where the check produces a false positive, i.e. you receive a warning but your code is correct and complies to the UI5 guidelines.
In such a case, you can be deactivate the rule by placing the following pseudo-comment block around your code.
**Please make sure to have your code reviewed by a colleague before you enter such a pseudo-comment.**

```js

/*eslint-disable sap-browser-api-error*/
   <your code>
/*eslint-enable sap-browser-api-error*/

```

## Bug report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading


