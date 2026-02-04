# Discourage usage of certain browser APIs (sap-browser-api-warning)

This is a collection of usages of browser APIs that might lead to issues.
Please search for the warning messages that you see in ESLint to find the explanation of the respective check.

## Disallow usage of browser APIs that might lead to issues.

Discourage usage of certain browser APIs.

## Rule details

#### Direct history manipulation

##### Warning message: _Direct DOM insertion, create a custom control instead_

The following patterns are considered warnings:

```js


if (this.editMode){

            window.history.back();

} else {

        this.oRouter.navTo("detail", {

        contextPath : "AccountCollection('"+responseObject.accountID+"')"

        }, true);

    },

```

The following patterns are not considered warnings:

```js

myNavBack : function(sRoute, mData) {

    var oHistory = sap.ui.core.routing.History.getInstance();

    var sPreviousHash = oHistory.getPreviousHash();

//The history contains a previous entry

    if (sPreviousHash !== undefined) {

/* eslint-disable sap-browser-api-warning */

        window.history.go(-1);

/* eslint-enable sap-browser-api-warning */

    } else {

        var bReplace = true; // otherwise we go backwards with a forward history

        this.navTo(sRoute, mData, bReplace)

    }

},

```

#### setTimeout usage

Executing logic with timeouts is often a workaround for faulty behavior and does not fix the root cause. The timing that works for you may not work under different circumstances (other geographical locations with greater network latency, or other devices that have slower processors) or when the code is changed. Use callbacks or events instead, if available. Please check the SAPUI5 guidelines for more details.

##### warning message: Timeout with value > 0

The following patterns are considered warnings:

```js
window.setTimeout(jQuery.proxy(processChanges, this), 50);
```

#### Global selection

##### warning message: Global selection modification, only modify local selections

The following patterns are considered warnings:

```js
window.getSelection().rangeCount = 9;
```

#### Proprietary browser API

Certain browser APIs are considered to be risky, when used directly and not wrapped via jQuery.

##### warning message: Proprietary Browser API access

The following patterns are considered warnings:

```js
var variab1 = window.innerWidth;

var myscreen = screen;
var variab5 = myscreen.something;

document.body.appendChild(x);
document.body.style.backgroundColor = 'yellow';

var mydocument = window.document;
mydocument.body.appendChild(x);
mydocument.body.style.backgroundColor = 'yellow';
var mydocument = document;
mydocument.body.appendChild(x);
mydocument.body.style.backgroundColor = 'yellow';
var abcss = window.document.body;
abcss.appendChild(x);
abcss.style.backgroundColor = 'yellow';
```

The following patterns are not considered warnings:

```js
var width = $(window).innerWidth();
```

#### DOM access

Accessing the DOM directly is considered risky. If necessary, a jQuery selector should be used instead.

##### warning message: Direct DOM access, use jQuery selector instead

The following patterns are considered warnings:

```js
document.getElementById('test');
```

## Bug report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further reading

