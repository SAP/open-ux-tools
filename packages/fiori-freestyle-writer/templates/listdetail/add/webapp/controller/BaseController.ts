import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Model from "sap/ui/model/Model";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import Controller from "sap/ui/core/mvc/Controller";
import View from "sap/ui/core/mvc/View";
import History from "sap/ui/core/routing/History";
import Router from "sap/ui/core/routing/Router";
import AppComponent from "../Component";
import { currencyValue } from "../model/formatter";

/**
 * @namespace <%- app.id %>
 */
export default class BaseController extends Controller {

    public readonly formatter = {
        currencyValue
    };

    /**
     * Convenience method for accessing the owner component.
     *
     * @returns the owner component
     */
    protected getUIComponent(): AppComponent {
        return super.getOwnerComponent() as AppComponent;
    }

    /**
     * Convenience method for accessing the router in every controller of the application.
     *
     * @returns the router for this component
     */
    protected getRouter(): Router {
        return this.getUIComponent().getRouter();
    }

    /**
     * Convenience method for getting the view model by name in every controller of the application.
     *
     * @param name the model name
     * @returns the model instance
     */
    protected getModel<T extends Model>(name?: string): T {
        return this.getView()!.getModel(name) as T;
    }

    /**
     * Convenience method for setting the view model in every controller of the application.
     *
     * @param model the model instance
     * @param name the model name
     * @returns the view instance
     */
    protected setModel(model: Model, name: string): View {
        return this.getView()!.setModel(model, name);
    }

    /**
     * Convenience method for getting the resource bundle.
     *
     * @returns the resourceBundle of the component
     */
     protected getResourceBundle(): ResourceBundle {
        return (this.getUIComponent().getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
    }

    /**
     * Event handler for navigating back.
     * It there is a history entry we go one step back in the browser history
     * If not, it will replace the current entry of the browser history with the list route.
     * 
     */
     protected onNavBack() {
        if (History.getInstance().getPreviousHash() !== undefined) {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        } else {
            this.getRouter().navTo("list", {});
        }
    }
}