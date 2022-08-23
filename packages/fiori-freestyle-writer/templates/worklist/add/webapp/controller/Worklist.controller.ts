import Event from "sap/ui/base/Event";
import History from "sap/ui/core/routing/History";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
import ObjectListItem from "sap/m/ObjectListItem";
import BaseController from "./BaseController";
import formatter from "../model/formatter";

/**
 * @namespace <%- app.id %>
 */
export default class Worklist extends BaseController {

    public readonly formatter = formatter;

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
        var sTitle,
            oTable = event.getSource(),
            iTotalItems = event.getParameter("total");
        // only update the counter if the length is final and
        // the table is not empty
        if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
            sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
        } else {
            sTitle = this.getResourceBundle().getText("worklistTableTitle");
        }
        this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
    }

    /**
     * Event handler when a table item gets pressed.
     *
     * @param event the table selectionChange event
     */
    public onPress(event: Event) {
        // The source is the list item that got pressed
        this.showObject(event.getSource());
    }

    /**
     * Event handler for navigating back.
     * Navigate back in the browser history
     *
     */
    public onNavBack() {
        // eslint-disable-next-line sap-no-history-manipulation
        History.go(-1);
    }


    public onSearch(event: Event) {
        if (event.getParameters().refreshButtonPressed) {
            // Search field's 'refresh' button has been pressed.
            // This is visible if you select any main list item.
            // In this case no new search is triggered, we only
            // refresh the list binding.
            this.onRefresh();
        } else {
            var aTableSearchState = [];
            var sQuery = event.getParameter("query");

            if (sQuery && sQuery.length > 0) {
                aTableSearchState = [new Filter("<%- template.settings.entity.idProperty %>", FilterOperator.Contains, sQuery)];
            }
            this.applySearch(aTableSearchState);
        }

    }

    /**
     * Event handler for refresh event. Keeps filter, sort
     * and group settings and refreshes the list binding.
     *
     */
    public onRefresh() {
        this.byId("table").getBinding("items").refresh();
    }

    /* =========================================================== */
    /* internal methods                                            */
    /* =========================================================== */

    /**
     * Shows the selected item on the object page
     * @param {sap.m.ObjectListItem} oItem selected Item
     * @private
     */
    showObject(item: ObjectListItem) {
        this.getRouter().navTo("object", {
            objectId: item.getBindingContext().getPath().substring("/<%- template.settings.entity.name %>".length)
        });
    }

    /**
     * Internal helper method to apply both filter and search state together on the list binding.
     *
     * @param aTableSearchState An array of filters for the search
     */
    private applySearch(tableSearchState: Filter[]) {
        var oTable = this.byId("table"),
            oViewModel = this.getModel("worklistView");
        oTable.getBinding("items").filter(tableSearchState, "Application");
        // changes the noDataText of the list in case there are no filter results
        if (tableSearchState.length !== 0) {
            oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
        }
    }
}
