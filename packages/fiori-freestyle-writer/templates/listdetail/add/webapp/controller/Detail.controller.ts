import { URLHelper } from "sap/m/library";
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import formatter from "../model/formatter";
import BaseController from "./BaseController";

/**
 * @namespace <%- app.id %>
 */
export default class Detail extends BaseController {

    public readonly formatter = formatter;

    /* =========================================================== */
    /* lifecycle methods                                           */
    /* =========================================================== */

    public onInit(): void {
        // Model used to manipulate control states. The chosen values make sure,
        // detail page is busy indication immediately so there is no break in
        // between the busy indication for loading the view's meta data
        const viewModel = new JSONModel({
            busy: false,
            delay: 0<%if (template.settings.lineItem.name) {%>,
            lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")<%}%>
        });

        this.getRouter().getRoute("object").attachPatternMatched(this.onObjectMatched, this);

        this.setModel(viewModel, "detailView");

        this.getOwnerComponent().getModel().metadataLoaded().then(this.onMetadataLoaded.bind(this));
    }

    /* =========================================================== */
    /* event handlers                                              */
    /* =========================================================== */

    /**
     * Event handler when the share by E-Mail button has been clicked
     */
    public onSendEmailPress() {
        const viewModel = this.getModel("detailView");

        URLHelper.triggerEmail(
            null,
            viewModel.getProperty("/shareSendEmailSubject"),
            viewModel.getProperty("/shareSendEmailMessage")
        );
    }

    <%if (template.settings.lineItem.name) {%>
    /**
     * Updates the item count within the line item table's header
     * @param event an event containing the total number of items in the list
     */
    public onListUpdateFinished(event: Event) {
        var sTitle,
            iTotalItems = event.getParameter("total"),
            viewModel = this.getModel("detailView");

        // only update the counter if the length is final
        if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
            if (iTotalItems) {
                sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
            } else {
                //Display 'Line Items' instead of 'Line items (0)'
                sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
            }
            viewModel.setProperty("/lineItemListTitle", sTitle);
        }
    }<%}%>

    /* =========================================================== */
    /* begin: internal methods                                     */
    /* =========================================================== */

    /**
     * Binds the view to the object path and expands the aggregated line items.
     * @function
     * @param event pattern match event in route 'object'
     * @private
     */
    private onObjectMatched(event: Event) {
        var sObjectId = event.getParameter("arguments").objectId;
        this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
        this.getModel().metadataLoaded().then(function (this: Detail) {
            var sObjectPath = this.getModel().createKey("<%=template.settings.entity.name%>", {
                <%=template.settings.entity.key%>: sObjectId
            });
            this.bindView("/" + sObjectPath);
        }.bind(this));
    }

    /**
     * Binds the view to the object path. Makes sure that detail view displays
     * a busy indicator while data for the corresponding element binding is loaded.
     * @function
     * @param objectPath path to the object to be bound to the view.
     */
    private bindView(objectPath) {
        // Set busy indicator during view binding
        var viewModel = this.getModel("detailView");

        // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
        viewModel.setProperty("/busy", false);

        this.getView().bindElement({
            path: objectPath,
            events: {
                change: this.onBindingChange.bind(this),
                dataRequested: function () {
                    viewModel.setProperty("/busy", true);
                },
                dataReceived: function () {
                    viewModel.setProperty("/busy", false);
                }
            }
        });
    }

    private onBindingChange() {
        const view = this.getView();
        const elementBinding = view.getElementBinding();

        // No data for the binding
        if (!elementBinding.getBoundContext()) {
            this.getRouter().getTargets().display("detailObjectNotFound");
            // if object could not be found, the selection in the list
            // does not make sense anymore.
            this.getOwnerComponent().listSelector.clearListListSelection();
            return;
        }

        var sPath = elementBinding.getPath(),
            oResourceBundle = this.getResourceBundle(),
            oObject = view.getModel().getObject(sPath),
            sObjectId = oObject.<%=template.settings.entity.key%>,
            sObjectName = oObject.<%=template.settings.entity.idProperty%>,
            viewModel = this.getModel("detailView");

        this.getOwnerComponent().listSelector.selectAListItem(sPath);

        viewModel.setProperty("/shareSendEmailSubject",
            oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
        viewModel.setProperty("/shareSendEmailMessage",
            oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
    }

    protected onMetadataLoaded() {
        // Store original busy indicator delay for the detail view
        var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
            viewModel = this.getModel("detailView")<%if (template.settings.lineItem.name) {%>,
            oLineItemTable = this.byId("lineItemsList"),
            iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();<%}%>;

        // Make sure busy indicator is displayed immediately when
        // detail view is displayed for the first time
        viewModel.setProperty("/delay", 0);<%if (template.settings.lineItem.name) {%>
        viewModel.setProperty("/lineItemTableDelay", 0);

        oLineItemTable.attachEventOnce("updateFinished", function () {
            // Restore original busy indicator delay for line item table
            viewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
        });<%}%>

        // Binding the view will set it to not busy - so the view is always busy if it is not bound
        viewModel.setProperty("/busy", true);
        // Restore original busy indicator delay for the detail view
        viewModel.setProperty("/delay", iOriginalViewBusyDelay);
    }

    /**
     * Set the full screen mode to false and navigate to list page
     */
    protected onCloseDetailPress() {
        this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
        // No item should be selected on list after detail page is closed
        this.getOwnerComponent().listSelector.clearListSelection();
        this.getRouter().navTo("list");
    }

    /**
     * Toggle between full and non full screen mode.
     */
    protected toggleFullScreen() {
        var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
        this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
        if (!bFullScreen) {
            // store current layout and go full screen
            this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
            this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
        } else {
            // reset to previous layout
            this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
        }
    }
}
