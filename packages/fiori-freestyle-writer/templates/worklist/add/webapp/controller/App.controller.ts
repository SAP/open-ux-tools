import BaseController from "./BaseController";

/**
 * @namespace <%- app.id %>
 */
export default class App extends BaseController {

    public onInit(): void {
        // apply content density mode to root view
        this.getView()!.addStyleClass(this.getUIComponent().getContentDensityClass());
    }
}
