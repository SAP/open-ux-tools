sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("testAppNamespace.worklistv2scp.controller.NotFound", {

        /**
         * Navigates to the worklist when the link is pressed
         * @public
         */
        onLinkPressed : function () {
            this.getRouter().navTo("worklist");
        }

    });

});