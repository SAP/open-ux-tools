import UI5Object from "sap/ui/base/Object";
import Log from "sap/base/Log";
import List from "sap/m/List";
import ListItemBase from "sap/m/ListItemBase";

/**
 * @namespace <%- app.id %>
 */
export default class ListSelector extends UI5Object {

    protected readonly oWhenListLoadingIsDone: Promise<any>;
    protected readonly _oWhenListHasBeenSet: Promise<any>;
    protected _oList: List;
    protected _fnResolveListHasBeenSet: any;

    /**
     * Provides a convenience API for selecting list items. All the functions will wait until the initial load of the a List passed to the instance by the setBoundList
     * function.
     */
     constructor() {
        super();
        this._oWhenListHasBeenSet = new Promise(function (this: ListSelector, fnResolveListHasBeenSet: ListSelector["_fnResolveListHasBeenSet"]) {
            this._fnResolveListHasBeenSet = fnResolveListHasBeenSet;
        }.bind(this));
        // This promise needs to be created in the constructor, since it is allowed to
        // invoke selectItem functions before calling setBoundList
        this.oWhenListLoadingIsDone = new Promise(function (this: ListSelector, resolve: (arg0: { oList: List; }) => void, reject: (arg0: { oList: List; }) => void) {
            this._oWhenListHasBeenSet
                .then(function (this: ListSelector, oList: List) {
                    oList.getBinding("items")?.attachEventOnce("dataReceived",
                        function (this: ListSelector) {
                            if (this._oList.getItems().length) {
                                resolve({ oList });
                            } else {
                                // No items in the list
                                reject({ oList });
                            }
                        }.bind(this)
                    );
                }.bind(this));
        }.bind(this));
    }

    /**
     * A bound list should be passed in here. Should be done, before the list has received its initial data from the server.
     * May only be invoked once per ListSelector instance.
     * @param list The list all the select functions will be invoked on.
     *
     */
     public setBoundList(oList: List) {
        this._oList = oList;
        this._fnResolveListHasBeenSet(oList);
    }

    /**
     * Tries to select and scroll to a list item with a matching binding context. If there are no items matching the binding context or the ListMode is none,
     * no selection/scrolling will happen
     * @param path the binding path matching the binding path of a list item
     *
     */
    public selectAListItem(path: string) {

        this.oWhenListLoadingIsDone.then(
            function (this: ListSelector) {
                const oList = this._oList;
                if (oList.getMode() === "None") {
                    return;
                }

                // skip update if the current selection is already matching the object path
                const selectedItem = oList.getSelectedItem();
                if (selectedItem && selectedItem.getBindingContext()!.getPath() === path) {
                    return;
                }

                oList.getItems().some(function (oItem: ListItemBase) {
                    if (oItem.getBindingContext() && oItem.getBindingContext()!.getPath() === path) {
                        oList.setSelectedItem(oItem);
                        return true;
                    }
                });
            }.bind(this),
            function () {
                Log.warning("Could not select the list item with the path" + path + " because the list encountered an error or had no items");
            }
        );
    }

    /**
     * Removes all selections from list.
     * Does not trigger 'selectionChange' event on list, though.
     */
    public async clearListSelection() {
        //use promise to make sure that 'this._oList' is available
        await this._oWhenListHasBeenSet;
        this._oList.removeSelections(true);
    }
}