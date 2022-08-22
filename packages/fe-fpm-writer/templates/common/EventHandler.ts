import MessageToast from 'sap/m/MessageToast';

export function <%- (typeof eventHandlerFnName !== 'undefined' && eventHandlerFnName) || 'onPress' %>() {
    MessageToast.show("Custom handler invoked.");
}