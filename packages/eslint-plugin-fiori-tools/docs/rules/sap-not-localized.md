# Hardcoded (not localized) string used (JS_NOT_LOCALIZED)

Don't use hardcoded strings, else they won't be translated. All strings should be localized and defined in an external file for translation.

_Warning Message: All strings should be localized and defined in an external file for translation_

## Rule Details

The rule checks the following methods in JavaScript

> _setText, setHeaderText, setPurpose_

whether they contain a string literal.

The following patterns are considered warnings:

```js
obj.setText('This is a hardcoded string');
obj.setHeaderText('This is a hardcoded string');
obj.setPurpose('This is a hardcoded string');
```

The following patterns are **NOT** considered warnings:

```js
obj.setText(i18n.someString);
```

## Bug Report

In case you detect an issue with the check please open a GitHub issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading