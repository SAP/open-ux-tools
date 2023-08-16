import UIComponent from "sap/ui/core/UIComponent";
import { support } from "sap/ui/Device";
import ErrorHandler from "./controller/ErrorHandler";
import ListSelector from "./controller/ListSelector";
import { createDeviceModel } from "./model/models";

/**
 * @namespace <%- app.id %>
 */
export default class Component extends UIComponent {

    public static metadata = {
        manifest: "json"
    };

    public listSelector: ListSelector;
    private errorHandler: ErrorHandler;
    private contentDensityClass: string;

    /**
     * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
     */
    public init(): void {
        // call the base component's init function
        super.init();

        this.listSelector = new ListSelector();
        this.errorHandler = new ErrorHandler(this);

        // enable routing
        this.getRouter().initialize();

        // set the device model
        this.setModel(createDeviceModel(), "device");
    }

    /**
     * The component is destroyed by UI5 automatically.
     * In this method, the ListSelector and ErrorHandler are destroyed.
     */
    public destroy() {
        this.listSelector.destroy();
        this.errorHandler.destroy();
        // call the base component's destroy function
        super.destroy();
    }

    /**
     * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
     * design mode class should be set, which influences the size appearance of some controls.
     * @return css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
     */
    public getContentDensityClass(): string {
        if (this.contentDensityClass === undefined) {
            // check whether FLP has already set the content density class; do nothing in this case
            // eslint-disable-next-line fiori-custom/sap-no-proprietary-browser-api
            if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
                this.contentDensityClass = "";
            } else if (!support.touch) { // apply "compact" mode if touch is not supported
                this.contentDensityClass = "sapUiSizeCompact";
            } else {
                // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
                this.contentDensityClass = "sapUiSizeCozy";
            }
        }
        return this.contentDensityClass;
    }
}