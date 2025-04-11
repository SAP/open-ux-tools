sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("testNameSpace.formentryv4.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * Gets the component startup parameters, setting preferredMode to 'create'.
             * @public
             * @returns 
             */
            getStartupParameters: function() {
                return Promise.resolve({
                    preferredMode: ["create"]
                });
            }
        });
    }
);