# Write to innerHTML (sap-no-inner-html-write)

Writing to innerHTML is not allowed.

## Rule details

It is not allowed to alter the DOM via the innerHTML attribute.

warning message: **"Writing to the inner html is not allowed."**

The following patterns are considered warnings:

```js
document.getElementById('button').innerHTML = 'send';
document.getElementById('button')['innerHTML'] = 'send';
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
