# Discourage usage of certain methods of document (sap-no-dom-access)

Accessing the DOM directly is considered risky. If necessary, a jQuery selector should be used instead.

## Rule details

The following methods are not allowed to use:

- getElementById
- getElementsByName
- getElementsByTagName
- getElementsByClassName

warning message: **Direct DOM access, use jQuery selector instead**

The following patterns are considered warnings:

```js
document.getElementById('test');
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
