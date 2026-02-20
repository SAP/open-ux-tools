# Detect dynamic style insertion (sap-no-dynamic-style-insertion)

## Rule Details

The check detects any usage of `document.styleSheets`.

The following patterns are considered warnings:

```js
var sheet = document.styleSheets[i];
var abc = document.styleSheets.length;
```

Warning message: _Dynamic style insertion, use library CSS or lessifier instead._

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

