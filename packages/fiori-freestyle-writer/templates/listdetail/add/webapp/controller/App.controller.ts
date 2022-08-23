import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";

/**
 * @namespace <%- app.id %>
 */
export default class App extends BaseController {

    public onInit(): void {
        const originalBusyDelay = this.getView().getBusyIndicatorDelay();

        const viewModel = new JSONModel({
            busy : true,
            delay : 0,
            layout : "OneColumn",
            previousLayout : "",
            actionButtonsInfo : {
                midColumn : {
                    fullScreen : false
                }
            }
        });
        this.setModel(viewModel, "appView");

        const fnSetAppNotBusy = function() {
            viewModel.setProperty("/busy", false);
            viewModel.setProperty("/delay", originalBusyDelay);
        };

        // since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
        this.getOwnerComponent().getModel().metadataLoaded().then(fnSetAppNotBusy);
        this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

        // apply content density mode to root view
        this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
    }
}
