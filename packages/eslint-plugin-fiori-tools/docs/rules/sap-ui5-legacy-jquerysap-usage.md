# Detect the usage of legacy jQuery.sap  (sap-ui5-legacy-jquerysap-usage)

## Rule Details

The rule detects 
1. Invocation of function "jQuery.sap.require(<any input>)" or "$.sap.require(<any input>)"
2. Invocation of function "jQuery.sap.declare(<any input>)" or "$.sap.declare(<any input>)"
   

Warning message: _Legacy jQuery.sap usage is not allowed due to strict Content Security Policy._

The following patterns are considered warnings:


```
jQuery.sap.require( 'sap.m.Button' );
```
```
$.sap.require( 'sap.m.Button' );
```
```
jQuery.sap.declare( "myModule" , true);                                                     
```
```
$.sap.declare( "myModule" , true);                                                   
```

## Bug report

In case you detect a problem with this check, please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAPUI5 Guidelines](https://ui5.sap.com/#/topic/a075ed88ef324261bca41813a6ac4a1c.html)