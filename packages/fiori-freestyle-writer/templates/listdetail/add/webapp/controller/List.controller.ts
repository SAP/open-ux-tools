import GroupHeaderListItem from "sap/m/GroupHeaderListItem";
import Button from "sap/m/Button";
import ListControl from "sap/m/List";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import Sorter from "sap/ui/model/Sorter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Device from "sap/ui/Device";
import Fragment from "sap/ui/core/Fragment";
import Event from "sap/ui/base/Event";
import formatter from "../model/formatter";
import BaseController from "./BaseController";

/**
 * @namespace <%- app.id %>
 */
export default class List extends BaseController {

    private list: ListControl;
    private listFilterState = {
        aFilter: [],
        aSearch: [] as Filter[]
    };<%if (template.settings.entity.numberProperty) {%>
    private groupFunctions: any;<%}%>

    public readonly formatter = formatter;

    /* =========================================================== */
    /* lifecycle methods                                           */
    /* =========================================================== */

    /**
     * Called when the list controller is instantiated. It sets up the event handling for the list/detail communication and other lifecycle tasks.
     */
    public onInit(): void {
        // Control state model
        this.list = this.byId("list");
        const viewModel = this.createViewModel();
        // Put down list's original value for busy indicator delay,
        // so it can be restored later on. Busy handling on the list is
        // taken care of by the list itself.
        const iOriginalBusyDelay = this.list.getBusyIndicatorDelay();

        <%if (template.settings.entity.numberProperty) {%>
        this.groupFunctions = {
            <%=template.settings.entity.numberProperty%>: function(oContext) {
                var iNumber = oContext.getProperty('<%=template.settings.entity.numberProperty%>'),
                    key, text;
                if (iNumber <= 20) {
                    key = "LE20";
                    text = this.getResourceBundle().getText("listGroup1Header1");
                } else {
                    key = "GT20";
                    text = this.getResourceBundle().getText("listGroup1Header2");
                }
                return {
                    key: key,
                    text: text
                };
            }.bind(this)
        };
<%}%>

        this.setModel(viewModel, "listView");
        // Make sure, busy indication is showing immediately so there is no
        // break after the busy indication for loading the view's meta data is
        // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
        this.list.attachEventOnce("updateFinished", function () {
            // Restore original busy indicator delay for the list
            viewModel.setProperty("/delay", iOriginalBusyDelay);
        });

        this.getView()!.addEventDelegate({
            onBeforeFirstShow: function () {
                this.getUIComponent().listSelector.setBoundList(this.list);
            }.bind(this)
        });

        this.getRouter().getRoute("list").attachPatternMatched(this._onMasterMatched, this);
        this.getRouter().attachBypassed(this.onBypassed, this);
    }

    /* =========================================================== */
    /* event handlers                                              */
    /* =========================================================== */

    /**
     * After list data is available, this handler method updates the
     * list counter
     * @param event the update finished event
     */
    public onUpdateFinished(event: Event) {
        // update the list object counter after new data is loaded
        this._updateListItemCount(event.getParameter("total"));
    }

    /**
     * Event handler for the list search field. Applies current
     * filter value and triggers a new search. If the search field's
     * 'refresh' button has been pressed, no new search is triggered
     * and the list binding is refresh instead.
     * @param event the search event
     */
    public onSearch(event: Event) {
        if (event.getParameters().refreshButtonPressed) {
            // Search field's 'refresh' button has been pressed.
            // This is visible if you select any list item.
            // In this case no new search is triggered, we only
            // refresh the list binding.
            this.onRefresh();
            return;
        }

        const query: string = event.getParameter("query");

        if (query) {
            this.listFilterState.aSearch = [new Filter("<%=template.settings.entity.idProperty%>", FilterOperator.Contains, query)];
        } else {
            this.listFilterState.aSearch = [];
        }
        this.applyFilterSearch();

    }

    /**
     * Event handler for refresh event. Keeps filter, sort
     * and group settings and refreshes the list binding.
     */
    public onRefresh() {
        this.list.getBinding("items").refresh();
    }

    /**
     * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
     * @param event the button press event
     */
    public onOpenViewSettings(event: Event) {
        var sDialogTab = "filter";
        if (event.getSource() instanceof Button) {
            var sButtonId = event.getSource().getId();
            if (sButtonId.match("sort")) {
                sDialogTab = "sort";
            } else if (sButtonId.match("group")) {
                sDialogTab = "group";
            }
        }
        // load asynchronous XML fragment
        if (!this.byId("viewSettingsDialog")) {
            Fragment.load({
                id: this.getView()!.getId(),
                name: "<%- app.id %>.view.ViewSettingsDialog",
                controller: this
            }).then(function (oDialog) {
                // connect dialog to the root view of this component (models, lifecycle)
                this.getView()!.addDependent(oDialog);
                oDialog.addStyleClass(this.getUIComponent().getContentDensityClass());
                oDialog.open(sDialogTab);
            }.bind(this));
        } else {
            this.byId("viewSettingsDialog").open(sDialogTab);
        }
    }

    /**
     * Event handler called when ViewSettingsDialog has been confirmed, i.e.
     * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
     * are applied to the list, which can also mean that they
     * are removed from the list, in case they are
     * removed in the ViewSettingsDialog.
     * @param event the confirm event
     * @public
     */
    public onConfirmViewSettingsDialog(event: Event) {
        <%if (template.settings.entity.numberProperty) {%>
        var aFilterItems = oEvent.getParameters().filterItems,
            aFilters = [],
            aCaptions = [];

        // update filter state:
        // combine the filter array and the filter string
        aFilterItems.forEach(function (oItem) {
            switch (oItem.getKey()) {
                case "Filter1" :
                    aFilters.push(new Filter("<%=template.settings.entity.numberProperty%>", FilterOperator.LE, 100));
                    break;
                case "Filter2" :
                    aFilters.push(new Filter("<%=template.settings.entity.numberProperty%>", FilterOperator.GT, 100));
                    break;
                default :
                    break;
            }
            aCaptions.push(oItem.getText());
        });

        this.listFilterState.aFilter = aFilters;
        this.updateFilterBar(aCaptions.join(", "));
        this.applyFilterSearch();<%}%>
        this.applySortGroup(event);
    }

    /**
     * Apply the chosen sorter and grouper to the list
     * @param event the confirm event
     */
     private applySortGroup(event: Event) {
        var mParams = event.getParameters(),
            sPath,
            bDescending,
            aSorters = [];
        <%if (template.settings.entity.numberProperty) {%>
        // apply sorter to binding
        // (grouping comes before sorting)
        if (mParams.groupItem) {
            sPath = mParams.groupItem.getKey();
            bDescending = mParams.groupDescending;
            var vGroup = this.groupFunctions[sPath];
            aSorters.push(new Sorter(sPath, bDescending, vGroup));
        }
        <%}%>
        sPath = mParams.sortItem.getKey();
        bDescending = mParams.sortDescending;
        aSorters.push(new Sorter(sPath, bDescending));
        this.list.getBinding("items").sort(aSorters);
    }

    /**
     * Event handler for the list selection event
     * @param {sap.ui.base.Event} oEvent the list selectionChange event
     * @public
     */
    onSelectionChange(oEvent) {
        var oList = oEvent.getSource(),
            bSelected = oEvent.getParameter("selected");

        // skip navigation when deselecting an item in multi selection mode
        if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
            // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
            this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
        }
    }

    /**
     * Event handler for the bypassed event, which is fired when no routing pattern matched.
     * If there was an object selected in the list, that selection is removed.
     * @public
     */
    onBypassed() {
        this.list.removeSelections(true);
    }

    /**
     * Used to create GroupHeaders with non-capitalized caption.
     * These headers are inserted into the list to
     * group the list's items.
     * @param {Object} oGroup group whose text is to be displayed
     * @public
     * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
     */
    createGroupHeader(oGroup) {
        return new GroupHeaderListItem({
            title: oGroup.text,
            upperCase: false
        });
    }

    /**
     * Event handler for navigating back.
     * We navigate back in the browser history
     * @public
     */
    onNavBack() {
        // eslint-disable-next-line sap-no-history-manipulation
        history.go(-1);
    }

    /* =========================================================== */
    /* begin: internal methods                                     */
    /* =========================================================== */


    private createViewModel() {
        return new JSONModel({
            isFilterBarVisible: false,
            filterBarLabel: "",
            delay: 0,
            title: this.getResourceBundle().getText("listTitleCount", [0]),
            noDataText: this.getResourceBundle().getText("listListNoDataText"),
            sortBy: "<%=template.settings.entity.idProperty%>",
            groupBy: "None"
        });
    }

    _onMasterMatched() {
        //Set the layout property of the FCL control to 'OneColumn'
        this.getModel("appView").setProperty("/layout", "OneColumn");
    }

    /**
     * Shows the selected item on the detail page
     * On phones a additional history entry is created
     * @param {sap.m.ObjectListItem} oItem selected Item
     * @private
     */
    _showDetail(oItem) {
        var bReplace = !Device.system.phone;
        // set the layout property of FCL control to show two columns
        this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
        this.getRouter().navTo("object", {
            objectId: oItem.getBindingContext().getProperty("<%=template.settings.entity.key%>")
        }, bReplace);
    }

    /**
     * Sets the item count on the list header
     * @param {integer} iTotalItems the total number of items in the list
     * @private
     */
    _updateListItemCount(iTotalItems) {
        var sTitle;
        // only update the counter if the length is final
        if (this.list.getBinding("items").isLengthFinal()) {
            sTitle = this.getResourceBundle().getText("listTitleCount", [iTotalItems]);
            this.getModel("listView").setProperty("/title", sTitle);
        }
    }

    /**
     * Internal helper method to apply both filter and search state together on the list binding
     */
    private applyFilterSearch() {
        var aFilters = this.listFilterState.aSearch.concat(this.listFilterState.aFilter),
            oViewModel = this.getModel("listView");
        this.list.getBinding("items").filter(aFilters, "Application");
        // changes the noDataText of the list in case there are no filter results
        if (aFilters.length !== 0) {
            oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("listListNoDataWithFilterOrSearchText"));
        } else if (this.listFilterState.aSearch.length > 0) {
            // only reset the no data text to default when no new search was triggered
            oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("listListNoDataText"));
        }
    }
<%if (template.settings.entity.numberProperty) {%>
    /**
     * Internal helper method that sets the filter bar visibility property and the label's caption to be shown.
     *
     * @param filterBarText the selected filter value
     */
    private updateFilterBar(filterBarText: string) {
        var oViewModel = this.getModel("listView");
        oViewModel.setProperty("/isFilterBarVisible", (this.listFilterState.aFilter.length > 0));
        oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("listFilterBarText", [filterBarText]));
    }<%}%>
}