# String Concatenation (`JS_CONCATENATED_STRINGS`)

String concatenation must not be performed manually because this determines a certain sequence which may not be valid for all languages.

**Warning message**: Strings must not be concatenated, all concatenations must be done as a specific parameterized resource_

## Rule Details

The rule checks the following methods in JavaScript

> _setText, setHeaderText, setPurpose_

The following patterns are considered warnings:

```js
obj.setText("Text " + "Hi");
obj.setHeaderText("Header: " + "Hi");
obj.setPurpose("Purpose: " + "Hi");
```

The following patterns are not considered warnings:

```js
obj.setText("ORGANIZER=Organizer: {0}");
obj.setText("{i18n>GREETING}");
obj.setText("{parts:[{path:'i18n>ORGANIZER'}, {path:'/Organizer/Mailbox/Name'}], formatter:'jQuery.sap.formatMessage'}")
```

## Bug Report

If you detect an issue with the check, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading