sap.ui.define(
    ["<%- app.baseComponent %>"],
    function (Component) {
        "use strict";

        return Component.extend("<%- app.id %>.Component", {
            metadata: {
                manifest: "json"
            }
        });
    }
);