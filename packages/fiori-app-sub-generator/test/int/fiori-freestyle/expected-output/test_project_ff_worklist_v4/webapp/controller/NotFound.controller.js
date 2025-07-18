sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("testprojectffworklistv4.controller.NotFound", {

        /**
         * Navigates to the worklist when the link is pressed
         * @public
         */
        onLinkPressed : function () {
            this.getRouter().navTo("worklist");
        }

    });

});