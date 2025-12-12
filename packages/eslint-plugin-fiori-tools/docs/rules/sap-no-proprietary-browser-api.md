# Discourage usage of proprietary browser API (sap-no-proprietary-browser-api)

## Rule details

Certain browser APIs are considered to be risky, when used directly and not wrapped via jQuery.
The check detects the following browser APIs:
`document.body.*`, `screen.*`, `window.innerWidth`, `window.innerHeight`

The following patterns are considered warnings:

```js
var variab1 = window.innerWidth;
var variab1 = window.innerHeight;

var myscreen = screen;
var x = myscreen.something;

document.body.appendChild(x);
document.body.style.backgroundColor = 'yellow';
```

The following patterns are not considered warnings:

```js
var width = $(window).innerWidth();
```

**Warning Message: _Proprietary Browser API access, use jQuery selector instead._**

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
