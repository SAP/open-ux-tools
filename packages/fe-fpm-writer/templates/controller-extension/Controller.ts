import ControllerExtension from 'sap/ui/core/mvc/ControllerExtension';
import ExtensionAPI from 'sap/fe/<%- typeof extension === "object" ? `templates/${extension.pageType}` : "core" -%>/ExtensionAPI';

/**
 * @namespace <%- ns %>
 * @controller
 */
export default class <%- name %> extends ControllerExtension<ExtensionAPI> {
	static overrides = {
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf <%- ns %>.<%- name %>
		 */
		onInit(this: <%- name %>) {
			// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
			const model = this.base.getExtensionAPI().getModel();
		}
	}
}