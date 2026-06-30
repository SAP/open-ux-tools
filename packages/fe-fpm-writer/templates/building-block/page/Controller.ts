import PageController from 'sap/fe/core/PageController';
import Event from 'sap/ui/base/Event';

/**
 * @namespace <%- namespace %>
 */
export default class <%- viewName %> extends PageController {

    /**
     * Called when a controller is instantiated and its View controls (if available) are already created.
     * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
     * @memberOf <%- namespace %>
     */
    // public onInit(): void {
    //     super.onInit(); // needs to be called to properly initialize the page controller
    // }

    /**
     * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
     * (NOT before the first rendering! onInit() is used for that one!).
     * @memberOf <%- namespace %>
     */
    // public onBeforeRendering(): void {
    //
    // }

    /**
     * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
     * This hook is the same one that SAPUI5 controls get after being rendered.
     * @memberOf <%- namespace %>
     */
    // public onAfterRendering(): void {
    //
    // }

    /**
     * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
     * @memberOf <%- namespace %>
     */
    // public onExit(): void {
    //
    // }

<% for (let i = 0; i < handlers.length; i++) { -%>
    /**
     * <%- handlers[i].doc %>
     * @memberOf <%- namespace %>
     */
    public <%- handlers[i].name %>(_event: Event): void {
        console.log('<%- handlers[i].log %>');
    }<% if (i < handlers.length - 1) { %>
<% } %>
<% } -%>
}
