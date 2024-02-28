import Controller from 'sap/ui/core/mvc/Controller'; /** If UI5 version 1.94 or newer can be used, the change the base controller to sap/fe/core/PageController to get full FEv4 FPM support */

/**
 * @namespace <%- ns %>
 */
export default class <%- name %> extends Controller {

    /**
     * Called when a controller is instantiated and its View controls (if available) are already created.
     * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
     * @memberOf <%- ns %>.<%- name %>
     */
    // public onInit(): void {
    //
    //}

    /**
     * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
     * (NOT before the first rendering! onInit() is used for that one!).
     * @memberOf <%- ns %>.<%- name %>
     */
    // public  onBeforeRendering(): void {
    //
    //  }

    /**
     * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
     * This hook is the same one that SAPUI5 controls get after being rendered.
     * @memberOf <%- ns %>.<%- name %>
     */
    // public  onAfterRendering(): void {
    //
    //  }

    /**
     * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
     * @memberOf <%- ns %>.<%- name %>
     */
    // public onExit(): void {
    //
    //  }
}