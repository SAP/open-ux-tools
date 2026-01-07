# Disallow usage dom insertion methods (sap-no-dom-insertion)

The UI5 guidelines do not allow insertion of elements into the DOM. Instead usage of a custom control should be considered.

## Rule Details

The rule detects all method calls of `insertBefore`, `appendChild`, `replaceChild`, `after`, `before`, `insertAfter`, `insertBefore`, `append`, `prepend`, `appendTo`, `prependTo`.

The following patterns are considered warnings:

```js
$('#container').append('Test');

var list = document.getElementById('myList1');
list.insertBefore(node, list.childNodes[0]);

myObject.after(document.body);
```

## False positives

There might be cases where the check produces a false positive, i.e. when you have a method containing one of the strings given above.
In such a case, you can change the method name or deactivate the rule by placing the following pseudo-comment block around your code.
**Please make sure to have your code reviewed by a colleague before you enter such a pseudo-comment.**

```js
/*eslint-disable sap-no-dom-insertion*/
   <your code>
/*eslint-enable sap-no-dom-insertion*/
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
