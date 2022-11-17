import GroupHeaderListItem from "sap/m/GroupHeaderListItem";
import Button from "sap/m/Button";
import ListControl from "sap/m/List";
import ObjectListItem from "sap/m/ObjectListItem";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import Filter from "sap/ui/model/Filter";
import Sorter from "sap/ui/model/Sorter";
import FilterOperator from "sap/ui/model/FilterOperator";
import { system } from "sap/ui/Device";
import Fragment from "sap/ui/core/Fragment";
import UI5Element from "sap/ui/core/Element";
import BaseController from "./BaseController";
import Control from "sap/ui/core/Control";
import ViewSettingsDialog from "sap/m/ViewSettingsDialog";
import ListBinding from "sap/ui/model/ListBinding";

/**
 * @namespace <%- app.id %>
 */
export default class List extends BaseController {

    private list: ListControl;
    private listFilterState = {
        aFilter: [],
        aSearch: [] as Filter[]
    };<%if (template.settings.entity.numberProperty) {%>
    private groupFunctions = {
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
    };<%}%>

    /**
     * Called when the list controller is instantiated. It sets up the event handling for the list/detail communication and other lifecycle tasks.
     */
    public onInit(): void {
        // Control state model
        this.list = this.byId("list") as ListControl;
        const viewModel = this.createViewModel();
        // Put down list's original value for busy indicator delay,
        // so it can be restored later on. Busy handling on the list is
        // taken care of by the list itself.
        const iOriginalBusyDelay = this.list.getBusyIndicatorDelay();

        this.setModel(viewModel, "listView");
        // Make sure, busy indication is showing immediately so there is no
        // break after the busy indication for loading the view's meta data is
        // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
        this.list.attachEventOnce("updateFinished", function (this: List) {
            // Restore original busy indicator delay for the list
            viewModel.setProperty("/delay", iOriginalBusyDelay);
        });

        this.getView()!.addEventDelegate({
            onBeforeFirstShow: function (this: List) {
                this.getUIComponent().listSelector.setBoundList(this.list);
            }.bind(this)
        });

        this.getRouter().getRoute("list")!.attachPatternMatched(this.onListMatched, this);
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
        this.updateListItemCount(event.getParameter("total"));
    }

    /**
     * Event handler for the list search field. Applies current
     * filter value and triggers a new search. If the search field's
     * 'refresh' button has been pressed, no new search is triggered
     * and the list binding is refresh instead.
     *
     * @param event the search event
     */
    public onSearch(event: Event) {
        if ((event.getParameters() as any).refreshButtonPressed) {
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
        this.list.getBinding("items")?.refresh(false);
    }

    /**
     * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
     * @param event the button press event
     */
    public onOpenViewSettings(event: Event) {
        let dialogTab = "filter";
        if (event.getSource() instanceof Button) {
            const buttonId = (event.getSource() as UI5Element).getId();
            if (buttonId.match("sort")) {
                dialogTab = "sort";
            } else if (buttonId.match("group")) {
                dialogTab = "group";
            }
        }
        // load asynchronous XML fragment
        let dialog = this.byId("viewSettingsDialog") as ViewSettingsDialog;
        if (!this.byId("viewSettingsDialog")) {
            Fragment.load({
                id: this.getView()!.getId(),
                name: "<%- app.id %>.view.ViewSettingsDialog",
                controller: this
            }).then(function (this: List, ctrl: Control | Control[]) {
                // connect dialog to the root view of this component (models, lifecycle)
                dialog = (Array.isArray(ctrl) ? ctrl[0] : ctrl) as ViewSettingsDialog;
                this.getView()!.addDependent(dialog as Control);
                dialog.addStyleClass(this.getUIComponent().getContentDensityClass());
                dialog.open(dialogTab);
            }.bind(this));
        } else {
            dialog.open(dialogTab);
        }
    }

    /**
     * Event handler called when ViewSettingsDialog has been confirmed, i.e.
     * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
     * are applied to the list, which can also mean that they
     * are removed from the list, in case they are
     * removed in the ViewSettingsDialog.
     * @param event the confirm event
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
        const params = event.getParameters() as {
            sortItem: any;
            groupItem?: any;
            sortDescending: boolean;
        };
        const sorters = [];
        <%if (template.settings.entity.numberProperty) {%>
        // apply sorter to binding
        // (grouping comes before sorting)
        if (params.groupItem) {
            const path = params.groupItem.getKey();
            const fnGroup = this.groupFunctions[path];
            aSorters.push(new Sorter(path, params.sortDescending, fnGroup));
        }
        <%}%>
        sorters.push(new Sorter(params.sortItem.getKey(), params.sortDescending));
        (this.list.getBinding("items") as ListBinding).sort(sorters);
    }

    /**
     * Event handler for the list selection event.
     *
     * @param event the list selectionChange event
     */
    onSelectionChange(event: Event) {
        const list = event.getSource() as ListControl;
        const selected = event.getParameter("selected");

        // skip navigation when deselecting an item in multi selection mode
        if (!(list.getMode() === "MultiSelect" && !selected)) {
            // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
            this.showDetail(event.getParameter("listItem") || event.getSource());
        }
    }

    /**
     * Event handler for the bypassed event, which is fired when no routing pattern matched.
     * If there was an object selected in the list, that selection is removed.
     *
     */
    onBypassed() {
        this.list.removeSelections(true);
    }

    /**
     * Used to create GroupHeaders with non-capitalized caption.
     * These headers are inserted into the list to
     * group the list's items.
     * @param group group whose text is to be displayed
     *
     * @returns group header with non-capitalized caption.
     */
    createGroupHeader(group: { text: string }): GroupHeaderListItem {
        return new GroupHeaderListItem({
            title: group.text,
            upperCase: false
        });
    }

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

    private onListMatched() {
        //Set the layout property of the FCL control to 'OneColumn'
        this.getModel<JSONModel>("appView").setProperty("/layout", "OneColumn");
    }

    /**
     * Shows the selected item on the detail page
     * On phones a additional history entry is created
     * @param item selected Item
     *
     */
    private showDetail(item: ObjectListItem) {
        // set the layout property of FCL control to show two columns
        this.getModel<JSONModel>("appView").setProperty("/layout", "TwoColumnsMidExpanded");
        this.getRouter().navTo("object", {
            objectId: item.getBindingContext()!.getProperty("<%=template.settings.entity.key%>")
        }, undefined, !system.phone);
    }

    /**
     * Sets the item count on the list header
     * @param total the total number of items in the list
     *
     */
    updateListItemCount(total: number) {
        // only update the counter if the length is final
        if ((this.list.getBinding("items") as ListBinding).isLengthFinal()) {
            const title = this.getResourceBundle().getText("listTitleCount", [total]);
            this.getModel<JSONModel>("listView").setProperty("/title", title);
        }
    }

    /**
     * Internal helper method to apply both filter and search state together on the list binding
     */
    private applyFilterSearch() {
        const filters = this.listFilterState.aSearch.concat(this.listFilterState.aFilter);
        const viewModel = this.getModel<JSONModel>("listView");
        (this.list.getBinding("items") as ListBinding).filter(filters, "Application");
        // changes the noDataText of the list in case there are no filter results
        if (filters.length !== 0) {
            viewModel.setProperty("/noDataText", this.getResourceBundle().getText("listListNoDataWithFilterOrSearchText"));
        } else if (this.listFilterState.aSearch.length > 0) {
            // only reset the no data text to default when no new search was triggered
            viewModel.setProperty("/noDataText", this.getResourceBundle().getText("listListNoDataText"));
        }
    }
<%if (template.settings.entity.numberProperty) {%>
    /**
     * Internal helper method that sets the filter bar visibility property and the label's caption to be shown.
     *
     * @param filterBarText the selected filter value
     */
    private updateFilterBar(filterBarText: string) {
        const viewModel = this.getModel<JSONModel>("listView");
        viewModel.setProperty("/isFilterBarVisible", (this.listFilterState.aFilter.length > 0));
        viewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("listFilterBarText", [filterBarText]));
    }<%}%>
}