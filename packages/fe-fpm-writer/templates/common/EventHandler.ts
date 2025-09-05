import ExtensionAPI from 'sap/fe/core/ExtensionAPI';
<% parameters.filter((param) => param.importType).forEach(function(param) { -%>
import <%- param.importType %> from '<%- param.importSource %>';
<% }) -%>
import MessageToast from 'sap/m/MessageToast';

/**
 * Generated event handler.
 *
 * @param this reference to the 'this' that the event handler is bound to.
<% parameters.forEach(function(param) { -%>
 * @param <%- param.name %> <%- param.description %>
<% }) -%>
 */
export function <%- eventHandlerFnName %>(this: ExtensionAPI, <%=
    parameters.map(function(param) {
        return param.name + ": " + param.importType;
    }).join(", ")
%>) {
    MessageToast.show("Custom handler invoked.");
}