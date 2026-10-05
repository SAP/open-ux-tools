# String concatenation (JS_CONCATENATED_STRINGS)

String concatenation should not be done manually because this would determine a certain sequence which might not be valid for all languages.

_Warning Message: Strings should not be concatenated, all concatenations must be done as a specific parameterized resource_

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

In case you detect an issue with the check please open a GitHub issue [here](https://github.tools.sap/FIORI-PIPELINE/fioriPipelinesGo/issues).

## Further Reading