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
            
            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            //init: function() {
            //    AppComponent.prototype.init.apply(this, arguments);
            //}
        });
});