import UI5Object from "sap/ui/base/Object";
import UIComponent from "sap/ui/core/UIComponent";
import MessageBox from "sap/m/MessageBox";
import Event from "sap/ui/base/Event";

/**
 * @namespace <%- app.id %>
 */
export default class ErrorHandler extends UI5Object {

    protected readonly component: UIComponent;
    protected messageOpen = false;

    /**
     * Handles application errors by automatically attaching to the model events and displaying errors when needed.
     * @param component reference to the app's component
     */
    public constructor(component: UIComponent) {
        super();
        this.component = component;
        const model = component.getModel();
        model.attachMetadataFailed(this.showServiceError);
        model.attachRequestFailed(function (this: ErrorHandler, event: Event) {
            const params = event.getParameters();
            // An entity that was not found in the service is also throwing a 404 error in oData.
            // We already cover this case with a notFound target so we skip it here.
            // A request that cannot be sent to the server is a technical error that we have to handle though
            if (params.response.statusCode !== "404" || (params.response.statusCode === 404 && params.response.responseText.indexOf("Cannot POST") === 0)) {
                this.showServiceError(event);
            }
        }, this);
    }

    /**
     * Shows a {@link sap.m.MessageBox} when a service call has failed.
     * Only the first error message will be display.
     * @param {string} sDetails a technical error to be displayed on request
     */
    private showServiceError(event: Event) {
        if (this.messageOpen) {
            return;
        }
        this.messageOpen = true;
        MessageBox.error(
            this.component.getModel("i18n").getText("errorText"),
            {
                id: "serviceErrorMessageBox",
                details: event.getParameters().response,
                styleClass: this.component.getContentDensityClass(),
                actions: [MessageBox.Action.CLOSE],
                onClose: function (this: ErrorHandler) {
                    this.messageOpen = false;
                }.bind(this)
            }
        );
    }

}