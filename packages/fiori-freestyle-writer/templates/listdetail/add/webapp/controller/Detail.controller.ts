import { URLHelper } from "sap/m/library";<%if (template.settings.lineItem.name) {%>
import Table from "sap/m/Table";<%}%>
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import ListBinding from "sap/ui/model/ListBinding";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import BaseController from "./BaseController";

/**
 * @namespace <%- app.id %>
 */
export default class Detail extends BaseController {

    public onInit(): void {
        // Model used to manipulate control states. The chosen values make sure,
        // detail page is busy indication immediately so there is no break in
        // between the busy indication for loading the view's meta data
        const viewModel = new JSONModel({
            busy: false,
            delay: 0<%if (template.settings.lineItem.name) {%>,
            lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")<%}%>
        });

        this.getRouter().getRoute("object")!.attachPatternMatched(this.onObjectMatched, this);

        this.setModel(viewModel, "detailView");

        (this.getUIComponent().getModel() as ODataModel).metadataLoaded().then(this.onMetadataLoaded.bind(this));
    }

    /**
     * Event handler when the share by E-Mail button has been clicked
     */
    public onSendEmailPress() {
        const viewModel = this.getModel("detailView");

        URLHelper.triggerEmail(
            undefined,
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
        const viewModel = this.getModel<JSONModel>("detailView");
        const totalItems = event.getParameter("total") as number;
        let title: string | undefined;
        // only update the counter if the length is final
        if ((this.byId("lineItemsList")!.getBinding("items") as ListBinding).isLengthFinal()) {
            if (totalItems) {
                title = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [totalItems]);
            } else {
                //Display 'Line Items' instead of 'Line items (0)'
                title = this.getResourceBundle().getText("detailLineItemTableHeading");
            }
            viewModel.setProperty("/lineItemListTitle", title);
        }
    }<%}%>

    /**
     * Binds the view to the object path and expands the aggregated line items.
     * @function
     * @param event pattern match event in route 'object'
     * @private
     */
     private onObjectMatched(event: Event) {
        const objectId = event.getParameter("arguments").objectId;
        this.getModel<JSONModel>("appView").setProperty("/layout", "TwoColumnsMidExpanded");
        this.getModel<ODataModel>().metadataLoaded().then(function (this: Detail) {
            const objectPath = this.getModel<ODataModel>().createKey("Suppliers", {
                SupplierID: objectId
            });
            this.bindView("/" + objectPath);
        }.bind(this));
    }

    /**
     * Binds the view to the object path. Makes sure that detail view displays
     * a busy indicator while data for the corresponding element binding is loaded.
     * @function
     * @param objectPath path to the object to be bound to the view.
     */
    private bindView(objectPath: string) {
        // Set busy indicator during view binding
        const viewModel = this.getModel<JSONModel>("detailView");

        // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
        viewModel.setProperty("/busy", false);

        this.getView()!.bindElement({
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
        const view = this.getView()!;
        const elementBinding = view.getElementBinding();

        // No data for the binding
        if (!elementBinding?.getBoundContext()) {
            this.getRouter().getTargets()!.display("detailObjectNotFound");
            // if object could not be found, the selection in the list
            // does not make sense anymore.
            this.getUIComponent().listSelector.clearListSelection();
            return;
        }

        if (elementBinding) {
            const path = elementBinding.getPath();
            const resourceBundle = this.getResourceBundle();
            const detailObject = this.getModel().getObject(path);
            const viewModel = this.getModel<JSONModel>("detailView");

            this.getUIComponent().listSelector.selectAListItem(path);

            viewModel.setProperty("/shareSendEmailSubject",
                resourceBundle.getText("shareSendEmailObjectSubject", [detailObject.<%=template.settings.entity.key%>]));
            viewModel.setProperty("/shareSendEmailMessage",
                resourceBundle.getText("shareSendEmailObjectMessage", [detailObject.<%=template.settings.entity.idProperty%>, detailObject.<%=template.settings.entity.key%>, location.href]));
        }    
    }

    protected onMetadataLoaded() {
        // Store original busy indicator delay for the detail view
        const originalViewBusyDelay = this.getView()!.getBusyIndicatorDelay();
        const viewModel = this.getModel<JSONModel>("detailView");<%if (template.settings.lineItem.name) {%>
        const lineItemTable = this.byId("lineItemsList") as Table;
        const originalLineItemTableBusyDelay = lineItemTable.getBusyIndicatorDelay();<%}%>

        // Make sure busy indicator is displayed immediately when
        // detail view is displayed for the first time
        viewModel.setProperty("/delay", 0);<%if (template.settings.lineItem.name) {%>
        viewModel.setProperty("/lineItemTableDelay", 0);

        lineItemTable.attachEventOnce("updateFinished", function () {
            // Restore original busy indicator delay for line item table
            viewModel.setProperty("/lineItemTableDelay", originalLineItemTableBusyDelay);
        });<%}%>

        // Binding the view will set it to not busy - so the view is always busy if it is not bound
        viewModel.setProperty("/busy", true);
        // Restore original busy indicator delay for the detail view
        viewModel.setProperty("/delay", originalViewBusyDelay);
    }

    /**
     * Set the full screen mode to false and navigate to list page
     */
    protected onCloseDetailPress() {
        this.getModel<JSONModel>("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
        // No item should be selected on list after detail page is closed
        this.getUIComponent().listSelector.clearListSelection();
        this.getRouter().navTo("list");
    }

    /**
     * Toggle between full and non full screen mode.
     */
    protected toggleFullScreen() {
        const viewModel = this.getModel<JSONModel>("appView");
        const fullScreen = viewModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
        viewModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", !fullScreen);
        if (!fullScreen) {
            // store current layout and go full screen
            viewModel.setProperty("/previousLayout", viewModel.getProperty("/layout"));
            viewModel.setProperty("/layout", "MidColumnFullScreen");
        } else {
            // reset to previous layout
            viewModel.setProperty("/layout", viewModel.getProperty("/previousLayout"));
        }
    }
}
