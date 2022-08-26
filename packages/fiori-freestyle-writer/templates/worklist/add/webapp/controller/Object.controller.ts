import Event from "sap/ui/base/Event";
import History from "sap/ui/core/routing/History";
import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";
import { currencyValue } from "../model/formatter";

/**
 * @namespace <%- app.id %>
 */
export default class Object extends BaseController {

    public readonly formatter = {
        currencyValue
    };

    /**
     * Called when the object controller is instantiated.
     *
     */
    public onInit() {
        // Model used to manipulate control states. The chosen values make sure,
        // detail page shows busy indication immediately so there is no break in
        // between the busy indication for loading the view's meta data
        var viewModel = new JSONModel({
            busy: true,
            delay: 0
        });
        this.getRouter().getRoute("object").attachPatternMatched(this.onObjectMatched, this);
        this.setModel(viewModel, "objectView");
    }

    /**
     * Event handler  for navigating back.
     * It there is a history entry we go one step back in the browser history
     * If not, it will replace the current entry of the browser history with the worklist route.
     *
     */
    public onNavBack() {
        var sPreviousHash = History.getInstance().getPreviousHash();
        if (sPreviousHash !== undefined) {
            // eslint-disable-next-line sap-no-history-manipulation
            History.go(-1);
        } else {
            this.getRouter().navTo("worklist", {}, true);
        }
    }

    /**
     * Binds the view to the object path.
     *
     * @param event pattern match event in route 'object'
     */
    private onObjectMatched(event: Event) {
        var sObjectId = event.getParameter("arguments").objectId;
        this.bindView("/<%- template.settings.entity.name %>" + sObjectId);
    }

    /**
     * Binds the view to the object path.
     *
     * @param objectPath path to the object to be bound
     */
    private bindView(objectPath: string) {
        var viewModel = this.getModel("objectView");

        this.getView()!.bindElement({
            path: objectPath,
            events: {
                change: this.onBindingChange.bind(this),
                dataRequested: function () {
                    viewModel.setProperty("/busy", true);
                },
                dataReceived: function () {
                    viewModel.setProperty("/busy", false);
                }
            }
        });
    }

    private onBindingChange() {
        var oView = this.getView(),
            viewModel = this.getModel("objectView"),
            oElementBinding = oView.getElementBinding();

        // No data for the binding
        if (!oElementBinding.getBoundContext()) {
            this.getRouter().getTargets().display("objectNotFound");
            return;
        }

        var oResourceBundle = this.getResourceBundle(),
            oObject = oView.getBindingContext().getObject(),
            sObjectId = oObject.<%- template.settings.entity.idProperty %>,
            sObjectName = oObject.<%- template.settings.entity.name %>;

        viewModel.setProperty("/busy", false);
        viewModel.setProperty("/shareSendEmailSubject",
            oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
        viewModel.setProperty("/shareSendEmailMessage",
            oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
    }
}
