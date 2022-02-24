sap.ui.define(
    ["<%- app.baseComponent %>"],
    function (Component) {
        "use strict";

        return Component.extend("<%- app.id %>.Component", {
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