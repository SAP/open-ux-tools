# Detect the usage of global eval via jQuery(.sap)  (sap-ui5-global-eval)

## Rule Details

The rule detects 
1. invocation of function "jQuery.sap.globalEval(<any input>)" or "$.sap.globalEval(<any input>)"
2. invocation of function "jQuery.globalEval(<any input>)" or "$.globalEval(<any input>)"
   

Warning message: _Usage of globalEval() / eval() is not allowed due to strict Content Security Policy._

The following patterns are considered warnings:

```
jQuery.globalEval( "var newVar = true;" );
```
```
jQuery.sap.globalEval( "var newVar = true;" );
```
```
$.globalEval( "var newVar = true;" );
```
```
$.sap.globalEval( "var newVar = true;" );
```
```
var a = jQuery.sap;
a.globalEval( "var newVar = true;" );
```

## Bug report

In case you detect a problem with this check, please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAPUI5 Guidelines](https://ui5.sap.com/#/api/jQuery.sap%23methods/jQuery.sap.globalEval)