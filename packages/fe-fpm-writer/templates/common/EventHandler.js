sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
<% if (typeof parameters !== "undefined" && parameters.length) { -%>
        /**
         * Generated event handler.
         *
<% parameters.forEach(function(param) { -%>
         * @param <%- param.name %> <%- param.description %>
<% }) -%>
         */
<% } -%>
        <%- eventHandlerFnName %>: function(<%=
            (typeof parameters !== "undefined" ? parameters : [])
                .map(function(param) {
                    return param.jsName;
                }).join(", ")
        -%>) {
            MessageToast.show("Custom handler invoked.");
        }
    };
});
