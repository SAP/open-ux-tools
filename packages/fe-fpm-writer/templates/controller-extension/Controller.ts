import ControllerExtension from 'sap/ui/core/mvc/ControllerExtension';
import ExtensionAPI from 'sap/fe/<%- typeof extension === "object" ? `templates/${extension.pageType}` : "core" -%>/ExtensionAPI';

/**
 * Helper to be able to define how to get the extension API when writing a controller extension.
 */
declare module 'sap/ui/core/mvc/ControllerExtension' {
    export default interface ControllerExtension {
        base: {
            getExtensionAPI(): ExtensionAPI;
        }
    }
}

/**
 * Cannot change to class syntax until https://github.com/SAP/ui5-typescript/issues/332 is fixed.
 */
export default ControllerExtension.extend('<%- ns %>.<%- name %>', {
	// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
	override: {
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf <%- ns %>.<%- name %>
		 */
		onInit(this: ControllerExtension) {
			// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
			const model = this.base.getExtensionAPI().getModel();
		}
	}
});