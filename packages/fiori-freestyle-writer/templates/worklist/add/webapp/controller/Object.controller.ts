import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";

/**
 * @namespace <%- app.id %>
 */
export default class Object extends BaseController {

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
        this.getRouter().getRoute("object")!.attachPatternMatched(this.onObjectMatched, this);
        this.setModel(viewModel, "objectView");
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
        const viewModel = this.getModel<JSONModel>("objectView");

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
        const view = this.getView()!;
        const viewModel = this.getModel<JSONModel>("objectView");
        const elementBinding = view.getElementBinding();

        // No data for the binding
        if (!elementBinding?.getBoundContext()) {
            this.getRouter().getTargets()!.display("objectNotFound");
            return;
        }

        const detailObject = view.getBindingContext()!.getObject() as { <%- template.settings.entity.idProperty %>: string; <%- template.settings.entity.name %>: string};
        const id = detailObject.<%- template.settings.entity.idProperty %>;
        const name = detailObject.<%- template.settings.entity.name %>;

        viewModel.setProperty("/busy", false);
        viewModel.setProperty("/shareSendEmailSubject",
            this.getResourceBundle().getText("shareSendEmailObjectSubject", [id]));
        viewModel.setProperty("/shareSendEmailMessage",
            this.getResourceBundle().getText("shareSendEmailObjectMessage", [name, id, location.href]));
}
}
