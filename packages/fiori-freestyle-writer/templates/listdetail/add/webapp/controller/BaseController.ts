import Controller from "sap/ui/core/mvc/Controller";
import History from "sap/ui/core/routing/History";
import Router from "sap/ui/core/routing/Router";
import Model from "sap/ui/model/Model";
import View from "sap/ui/core/mvc/View";
import ResourceModel from "sap/ui/model/resource/ResourceModel";

/**
 * @namespace <%- app.id %>
 */
export default class BaseController extends Controller {
    /**
     * Convenience method for accessing the router in every controller of the application.
     *
     * @returns the router for this component
     */
    protected getRouter(): Router {
        return this.getOwnerComponent().getRouter();
    }

    /**
     * Convenience method for getting the view model by name in every controller of the application.
     *
     * @param name the model name
     * @returns the model instance
     */
    protected getModel(name: string): Model {
        return this.getView().getModel(name);
    }

    /**
     * Convenience method for setting the view model in every controller of the application.
     *
     * @param model the model instance
     * @param name the model name
     * @returns the view instance
     */
    protected setModel(model: Model, name: string): View {
        return this.getView().setModel(model, name);
    }

    /**
     * Convenience method for getting the resource bundle.
     *
     * @returns the resourceModel of the component
     */
    protected getResourceBundle(): ResourceModel {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle();
    }

    /**
     * Event handler for navigating back.
     * It there is a history entry we go one step back in the browser history
     * If not, it will replace the current entry of the browser history with the list route.
     * 
     */
    protected onNavBack() {
        var previousHash = History.getInstance().getPreviousHash();
        if (previousHash !== undefined) {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        } else {
            this.getRouter().navTo("list", {}, true);
        }
    }
}