# Detect the usage of forbidden window properties (sap-forbidden-window-property)

## Rule Details

Warning message: _Usage of a forbidden window property._

For `window.alert`: _A window.alert statement should not be part of the code that is committed to GIT! Use sap.m.MessageBox instead._

The following patterns are considered warnings:

```js
var top = window.top;
window.addEventListener(listener);
window.alert('hello world');
```

## Further Reading

- For `window.alert`, please check the [UI5 API](https://ui5.sap.com/#/api/sap.m.MessageBox) reference for examples on using sap.m.MessageBox instead.

