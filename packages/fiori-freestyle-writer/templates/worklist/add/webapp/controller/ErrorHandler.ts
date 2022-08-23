import UI5Object from "sap/ui/base/Object";
import UIComponent from "sap/ui/core/UIComponent";
import MessageBox from "sap/m/MessageBox";
import Event from "sap/ui/base/Event";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
//import { getCore } from "sap/ui";

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
        var oMessageManager = sap.ui.getCore().getMessageManager(),
        oMessageModel = oMessageManager.getMessageModel(),
        oResourceBundle = component.getModel("i18n").getResourceBundle(),
        sErrorText = oResourceBundle.getText("errorText"),
        sMultipleErrors = oResourceBundle.getText("multipleErrorsText");

        this.messageOpen = false;

        const messageModelBinding = oMessageModel.bindList("/", undefined,
            [], new Filter("technical", FilterOperator.EQ, true));

        messageModelBinding.attachChange(function (this: ErrorHandler, event: Event) {
            var aContexts = event.getSource().getContexts(),
                aMessages = [],
                sErrorTitle;

            if (this.messageOpen || !aContexts.length) {
                return;
            }

            // Extract and remove the technical messages
            aContexts.forEach(function (oContext) {
                aMessages.push(oContext.getObject());
            });
            oMessageManager.removeMessages(aMessages);

            // Due to batching there can be more than one technical message. However the UX
            // guidelines say "display a single message in a message box" assuming that there
            // will be only one at a time.
            sErrorTitle = aMessages.length === 1 ? sErrorText : sMultipleErrors;
            this.showServiceError(sErrorTitle, aMessages[0].message);
        }, this);
    }

    /**
     * Shows a {@link sap.m.MessageBox} when a service call has failed.
     * Only the first error message will be display.
     *
     * @param errorTitle A title for the error message
     * @param details a technical error to be displayed on request
     */
    private showServiceError(errorTitle: string, details: string) {
        this.messageOpen = true;
        MessageBox.error(
            errorTitle,
            {
                id : "serviceErrorMessageBox",
                details,
                styleClass: this.component.getContentDensityClass(),
                actions: [MessageBox.Action.CLOSE],
                onClose: function () {
                    this._bMessageOpen = false;
                }.bind(this)
            }
        );
    }

}