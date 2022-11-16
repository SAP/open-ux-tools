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
    protected list: List;
    protected _fnResolveListHasBeenSet: any;

    /**
     * Provides a convenience API for selecting list items. All the functions will wait until the initial load of the a List passed to the instance by the setBoundMasterList
     * function.
     */
     constructor() {
        super();
        this._oWhenListHasBeenSet = new Promise(function (this: ListSelector, fnResolveListHasBeenSet: ListSelector['_fnResolveListHasBeenSet']) {
            this._fnResolveListHasBeenSet = fnResolveListHasBeenSet;
        }.bind(this));
        // This promise needs to be created in the constructor, since it is allowed to
        // invoke selectItem functions before calling setBoundList
        this.oWhenListLoadingIsDone = new Promise(function (this: ListSelector, resolve: Function, reject: Function) {
            this._oWhenListHasBeenSet
                .then(function (this: ListSelector, list: List) {
                    list.getBinding("items")?.attachEventOnce("dataReceived",
                        function (this: ListSelector) {
                            if (this.list.getItems().length) {
                                resolve({ list });
                            } else {
                                // No items in the list
                                reject({ list });
                            }
                        }.bind(this)
                    );
                }.bind(this));
        }.bind(this));
    };

    /**
     * A bound list should be passed in here. Should be done, before the list has received its initial data from the server.
     * May only be invoked once per ListSelector instance.
     * @param list The list all the select functions will be invoked on.
     *
     */
     public setBoundList(list: List) {
        this.list = list;
        this._fnResolveListHasBeenSet(list);
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
                const list = this.list;
                if (list.getMode() === "None") {
                    return;
                }

                // skip update if the current selection is already matching the object path
                const selectedItem = list.getSelectedItem();
                if (selectedItem && selectedItem.getBindingContext()!.getPath() === path) {
                    return;
                }

                list.getItems().some(function (oItem: ListItemBase) {
                    if (oItem.getBindingContext() && oItem.getBindingContext()!.getPath() === path) {
                        list.setSelectedItem(oItem);
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
        //use promise to make sure that 'this.list' is available
        await this._oWhenListHasBeenSet;
        this.list.removeSelections(true);
    }
}