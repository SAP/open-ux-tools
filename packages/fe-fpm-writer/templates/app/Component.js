sap.ui.define(
    [
        "sap/fe/core/AppComponent"
    ], 
    function(AppComponent) {
	    "use strict";
        
        return AppComponent.extend("<%- id %>.Component", {
            metadata: {
                manifest: "json"
            }
        });
});