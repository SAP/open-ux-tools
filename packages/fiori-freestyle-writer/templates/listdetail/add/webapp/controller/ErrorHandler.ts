import MessageBox, { Action } from "sap/m/MessageBox";
import UI5Object from "sap/ui/base/Object";
import Event from "sap/ui/base/Event";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import AppComponent from "../Component";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";

/**
 * @namespace <%- app.id %>
 */
export default class ErrorHandler extends UI5Object {

    protected readonly component: AppComponent;
    protected messageOpen = false;

    /**
     * Handles application errors by automatically attaching to the model events and displaying errors when needed.
     * @param component reference to the app's component
     */
    public constructor(component: AppComponent) {
        super();
        this.component = component;
        const model = component.getModel() as ODataModel;
        model.attachMetadataFailed(this.showServiceError);
        model.attachRequestFailed(function (this: ErrorHandler, event: Event) {
            const params = event.getParameters() as { response: XMLHttpRequest['response'] };
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
            ((this.component.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle).getText("errorText") || "",
            {
                id: "serviceErrorMessageBox",
                details: (event.getParameters() as XMLHttpRequest['response']).response,
                styleClass: this.component.getContentDensityClass(),
                actions: [Action.CLOSE],
                onClose: function (this: ErrorHandler) {
                    this.messageOpen = false;
                }.bind(this)
            }
        );
    }

}