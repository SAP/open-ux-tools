import ResourceBundle from "sap/base/i18n/ResourceBundle";
import { URLHelper } from "sap/m/library";
import Model from "sap/ui/model/Model";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import Controller from "sap/ui/core/mvc/Controller";
import View from "sap/ui/core/mvc/View";
import UIComponent from "sap/ui/core/UIComponent";
import Router from "sap/ui/core/routing/Router";

/**
 * @namespace <%- app.id %>
 */
export default class BaseController extends Controller {
    /**
     * Convenience method for accessing the owner component as UIComponent.
     *
     * @returns the owner component
     */
     protected getUIComponent(): UIComponent {
        return super.getOwnerComponent() as UIComponent;
    }

    /**
     * Convenience method for accessing the router in every controller of the application.
     *
     * @returns the router for this component
     */
    protected getRouter(): Router {
        return (this.getOwnerComponent() as UIComponent).getRouter();
    }

    /**
     * Convenience method for getting the view model by name in every controller of the application.
     *
     * @param name the model name
     * @returns the model instance
     */
    protected getModel(name: string): Model {
        return this.getView()!.getModel(name);
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
     protected getResourceBundle(): ResourceBundle | Promise<ResourceBundle> {
        return (this.getUIComponent().getModel("i18n") as ResourceModel).getResourceBundle();
    }

    /**
     * Event handler when the share by E-Mail button has been clicked.
     * 
     */
    public onShareEmailPress() {
        const viewModel = (this.getModel("objectView") || this.getModel("worklistView"));
        URLHelper.triggerEmail(
            undefined,
            viewModel.getProperty("/shareSendEmailSubject"),
            viewModel.getProperty("/shareSendEmailMessage")
        );
    }
}