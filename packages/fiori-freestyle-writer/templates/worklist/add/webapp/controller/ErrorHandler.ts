import UI5Object from "sap/ui/base/Object";
import MessageBox, { Action } from "sap/m/MessageBox";
import Event from "sap/ui/base/Event";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import AppComponent from "../Component";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Message from "sap/ui/core/message/Message";
import ListBinding from "sap/ui/model/ListBinding";

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
        const messageManager = sap.ui.getCore().getMessageManager();
        const resourceBundle = (component.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;

        const messageModelBinding = messageManager.getMessageModel().bindList("/", undefined,
            [], new Filter("technical", FilterOperator.EQ, true));
        messageModelBinding.attachChange(function (this: ErrorHandler, event: Event) {
            const contexts = (event.getSource() as ListBinding).getContexts();
            if (this.messageOpen || !contexts.length) {
                return;
            }

            // Extract and remove the technical messages
            const messages: Message[] = [];
            contexts.forEach(function (context) {
                messages.push(context.getObject() as Message);
            });
            messageManager.removeMessages(messages);

            // Due to batching there can be more than one technical message. However the UX
            // guidelines say "display a single message in a message box" assuming that there
            // will be only one at a time.
            const errorTitle = resourceBundle.getText(messages.length === 1 ? "errorText" : "multipleErrorsText") || "";
            this.showServiceError(errorTitle, messages[0].getMessage());
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
                actions: [Action.CLOSE],
                onClose: function (this: ErrorHandler) {
                    this.messageOpen = false;
                }.bind(this)
            }
        );
    }
}