import ControllerExtension from "sap/ui/core/mvc/ControllerExtension";

export default ControllerExtension.extend('<%- ns %>.<%- name %>', {
	// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
	override: {
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf <%- ns %>.<%- name %>
		 */
		onInit: function () {
			// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
			const model = this.base.getExtensionAPI().getModel();
		}
	}
});