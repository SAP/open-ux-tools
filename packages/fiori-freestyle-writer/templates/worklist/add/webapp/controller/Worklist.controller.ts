import Event from "sap/ui/base/Event";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
import ObjectListItem from "sap/m/ObjectListItem";
import BaseController from "./BaseController";
import Table from "sap/m/Table";
import ListBinding from "sap/ui/model/ListBinding";

/**
 * @namespace <%- app.id %>
 */
export default class Worklist extends BaseController {
    /**
     * Called when the worklist controller is instantiated.
     *
     */
    public onInit() {
        // Model used to manipulate control states
        const viewModel = new JSONModel({
            worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
            shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
            shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
            tableNoDataText: this.getResourceBundle().getText("tableNoDataText")
        });
        this.setModel(viewModel, "worklistView");
    }

    /**
     * Triggered by the table's 'updateFinished' event: after new table
     * data is available, this handler method updates the table counter.
     * This should only happen if the update was successful, which is
     * why this handler is attached to 'updateFinished' and not to the
     * table's list binding's 'dataReceived' method.
     *
     * @param event the update finished event
     */
    public onUpdateFinished(event: Event) {
        // update the worklist's object counter after the table update
        const table = event.getSource() as Table;
        const total = event.getParameter("total") as number;
        // only update the counter if the length is final and
        // the table is not empty
        let title: string | undefined;
        if (total && (table.getBinding("items") as ListBinding).isLengthFinal()) {
            title = this.getResourceBundle().getText("worklistTableTitleCount", [total]);
        } else {
            title = this.getResourceBundle().getText("worklistTableTitle");
        }
        this.getModel<JSONModel>("worklistView").setProperty("/worklistTableTitle", title);
    }

    /**
     * Event handler when a table item gets pressed.
     *
     * @param event the table selectionChange event
     */
    public onPress(event: Event) {
        // The source is the list item that got pressed
        this.showObject(event.getSource() as ObjectListItem);
    }

    public onSearch(event: Event) {
        if ((event.getParameters() as any).refreshButtonPressed) {
            // Search field's 'refresh' button has been pressed.
            // This is visible if you select any list item.
            // In this case no new search is triggered, we only
            // refresh the list binding.
            this.onRefresh();
        } else {
            const tableSearchState: Filter[] = [];
            var sQuery = event.getParameter("query");

            if (sQuery && sQuery.length > 0) {
                tableSearchState.push(new Filter("Name", FilterOperator.Contains, sQuery));
            }
            this.applySearch(tableSearchState);
        }
    }

    /**
     * Event handler for refresh event. Keeps filter, sort
     * and group settings and refreshes the list binding.
     *
     */
    public onRefresh() {
        this.byId("table")?.getBinding("items")?.refresh(false);
    }

    /**
     * Shows the selected item on the object page,
     *
     * @param item selected Item
     */
    private showObject(item: ObjectListItem) {
        this.getRouter().navTo("object", {
            objectId: item.getBindingContext()!.getPath().substring("/SEPMRA_C_PD_Product".length)
        });
    }

    /**
     * Internal helper method to apply both filter and search state together on the list binding.
     *
     * @param tableSearchState An array of filters for the search
     */
    private applySearch(tableSearchState: Filter[]) {
        const table = this.byId("table") as Table;
        const viewModel = this.getModel<JSONModel>("worklistView");
        (table.getBinding("items") as ListBinding).filter(tableSearchState, "Application");
        // changes the noDataText of the list in case there are no filter results
        if (tableSearchState.length !== 0) {
            viewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
        }
    }
}
