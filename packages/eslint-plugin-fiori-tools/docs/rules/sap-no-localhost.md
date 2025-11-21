# Disallow use localhost (sap-no-localhost)

Usage of `localhost` in Fiori apps is often done for debugging or test reasons and should be avoided in in productive code.

## Rule Details

The check detects the string "localhost" in any JavaScript function call or expression.
The usage of localhost in an offline scenario is allowed, therefore coding mentioned below will not raise a warning.

The following patterns are considered warnings:

```js
if (location.hostname === 'localhost') {
}
location.host.indexOf('localhost');
```

The following patterns are not considered warnings:

```js
return 'http://localhost/offline/my_contacts/ContactCollection';
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
