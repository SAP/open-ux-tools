# Discourage the access of innerHTML (sap-no-inner-html-access)

Accessing the DOM directly is considered risky.

## Rule details

It is not recommended to access the DOM via the innerHTML attribute.

warning message: **Accessing the inner html is not recommended.**

The following patterns are considered warnings:

```js
if ('some text' === button.innerHTML) {
  doSomething();
}
document.getElementById('button').innerHTML = 'send';
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
