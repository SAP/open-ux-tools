import BaseController from "./BaseController";

/**
 * @namespace <%- app.id %>
 */
export default class NotFound extends BaseController {
    onInit() {
        this.getRouter().getTarget("notFound").attachDisplay(this._onNotFoundDisplayed, this);
    }

    _onNotFoundDisplayed() {
        this.getModel("appView").setProperty("/layout", "OneColumn");
    }
}
