import Controller from 'sap/fe/core/PageController';

/**
 * @namespace v4travel.ext.myCustomPage.MyCustomPage.controller
 */
export default class MyCustomPage extends Controller {
    /**
     * Called when a controller is instantiated and its View controls (if available) are already created.
     * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
     *
     * @memberOf v4travel.ext.myCustomPage.MyCustomPage
     */
    // public onInit(): void {
    //
    //}
    /**
     * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
     * (NOT before the first rendering! onInit() is used for that one!).
     *
     * @memberOf v4travel.ext.myCustomPage.MyCustomPage
     */
    // public  onBeforeRendering(): void {
    //
    //  },
    /**
     * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
     * This hook is the same one that SAPUI5 controls get after being rendered.
     *
     * @memberOf v4travel.ext.myCustomPage.MyCustomPage
     */
    // public  onAfterRendering(): void {
    //
    //  },
    /**
     * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
     *
     * @memberOf v4travel.ext.myCustomPage.MyCustomPage
     */
    // public onExit(): void {
    //
    //  }
}
