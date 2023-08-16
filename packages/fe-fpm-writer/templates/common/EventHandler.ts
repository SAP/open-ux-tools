import ExtensionAPI from 'sap/fe/core/ExtensionAPI';
import <%- parameters.importType %> from '<%- parameters.importSource %>';
import MessageToast from 'sap/m/MessageToast';

/**
 * Generated event handler.
 *
 * @param this reference to the 'this' that the event handler is bound to.
 * @param <%- parameters.name %> <%- parameters.description %>
 */
export function <%- eventHandlerFnName %>(this: ExtensionAPI, <%- parameters.name %>: <%- parameters.importType %>) {
    MessageToast.show("Custom handler invoked.");
}