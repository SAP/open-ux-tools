# Detect the usage of legacy UI5 factories (sap-ui5-legacy-factories)

## Rule Details

The rule detects 
1. Invocation of function "sap.ui.component(<any input>)"
2. Invocation of function "sap.ui.component.load(<any input>)"
3. Invocation of function "sap.ui.view(<any input>)"
4. Invocation of function "sap.ui.xmlview(<any input>)"
5. Invocation of function "sap.ui.jsview(<any input>)"
6. Invocation of function "sap.ui.controller(<any input>)"
7. Invocation of function "sap.ui.extensionpoint(<any input>)"
8.  Invocation of function "sap.ui.fragment(<any input>)"
9.  Invocation of function "sap.ui.getVersionInfo(<any input>)"
10. Invocation of function "jQuery.sap.resources(<any input>)" or "$.sap.resources(<any input>)"
   

Warning message: _Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading._

The following patterns are considered warnings:

```
var oView = sap.ui.jsview({								
    viewName: "my.View"                                                            
});
```
```
var oComponentInstance = sap.ui.component({								
    name: "my.comp"                                                          
});
```
```
sap.ui.component({
    name: "my.comp"                              
});                                                      
```
```
var oComponentClass = sap.ui.component.load({
    name: "my.comp"                               
});
```
```
var oComponentInstance = sap.ui.component("my-comp-id");
```

```
var oView = sap.ui.view({
    viewName: "my.View",                              
    type: "XML"
});
```

```
var oView = sap.ui.xmlview({
    viewName: "my.View"                              
});
```

```
var oController = sap.ui.controller({
    name: "my.Controller"                              
});
```

```
var aControls = sap.ui.extensionpoint({
    name: "my.Point"                              
});
```

```
var aControls = sap.ui.fragment({ 
    name: "my.fragment",                               
    type: "XML" 
});
```

```
var oVersionInfo = sap.ui.getVersionInfo();
```

```
jQuery.sap.resources({
    url: "mybundle.properties"                                                            
});
```

```
$.sap.resources({
    url: "mybundle.properties"                                                            
});
```


## Bug report

In case you detect a problem with this check, please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAPUI5 Guidelines : Legacy Factories Replacement](https://ui5.sap.com/#/topic/491bd9c70b9f4c4d913c8c7b4a970833.html)