# Hardcoded Strings Used (`JS_NOT_LOCALIZED`)

Don't use hardcoded strings, else they won't be translated. All strings must be localized and defined in an external file for translation.

**Warning message**: All strings should be localized and defined in an external file for translation.

## Rule Details

The rule checks the following methods in JavaScript for whether they contain a string literal:

> _setText, setHeaderText, setPurpose_


The following patterns are considered warnings:

```js
obj.setText('This is a hardcoded string');
obj.setHeaderText('This is a hardcoded string');
obj.setPurpose('This is a hardcoded string');
```

The following patterns are not considered warnings:

```js
obj.setText(i18n.someString);
```

## Bug Report

If you detect an issue with the check, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading