sap.ui.define(
    [
        'sap/fe/core/PageController'
    ],
    function(PageController) {
        'use strict';

        return PageController.extend('<%- namespace %>', {
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf <%- namespace %>
             */
            //  onInit: function () {
            //      PageController.prototype.onInit.apply(this, arguments); // needs to be called to properly initialize the page controller
            //  },

            /**
             * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
             * (NOT before the first rendering! onInit() is used for that one!).
             * @memberOf <%- namespace %>
             */
            //  onBeforeRendering: function() {
            //
            //  },

            /**
             * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
             * This hook is the same one that SAPUI5 controls get after being rendered.
             * @memberOf <%- namespace %>
             */
            //  onAfterRendering: function() {
            //
            //  },

            /**
             * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
             * @memberOf <%- namespace %>
             */
            //  onExit: function() {
            //
            //  }

<% for (let i = 0; i < handlers.length; i++) { -%>
            /**
             * <%- handlers[i].doc %>
             * @memberOf <%- namespace %>
             */
            <%- handlers[i].name %>: function() {
                console.log('<%- handlers[i].log %>');
            }<% if (i < handlers.length - 1) { %>,<% } %>

<% } -%>
        });
    }
);
