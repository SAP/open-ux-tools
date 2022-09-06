import ControllerExtension from 'sap/ui/core/mvc/ControllerExtension';
import ExtensionAPI from 'sap/fe/<%- typeof extension === "object" ? `templates/${extension.pageType}` : "core" -%>/ExtensionAPI';

/**
 * Definition of the override interface as workaround until https://github.com/SAP/ui5-typescript/issues/332 is fixed.
 */
interface ExtensionOverride {
	base: {
		getExtensionAPI(): ExtensionAPI;
	}
}

export default ControllerExtension.extend('<%- ns %>.<%- name %>', {
	// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
	override: {
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf <%- ns %>.<%- name %>
		 */
		onInit(this: ExtensionOverride) {
			// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
			const model = this.base.getExtensionAPI().getModel();
		}
	}
});