import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import BaseController from "./BaseController";

/**
 * @namespace <%- app.id %>
 */
export default class App extends BaseController {

    public onInit(): void {
        const originalBusyDelay = this.getView()!.getBusyIndicatorDelay();

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
        const mainModel: ODataModel = this.getUIComponent().getModel() as ODataModel;
        mainModel.metadataLoaded().then(fnSetAppNotBusy);
        mainModel.attachMetadataFailed(fnSetAppNotBusy);

        // apply content density mode to root view
        this.getView()!.addStyleClass(this.getUIComponent().getContentDensityClass());
    }
}
