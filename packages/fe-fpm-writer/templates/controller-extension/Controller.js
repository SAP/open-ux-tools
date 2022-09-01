sap.ui.define(['sap/ui/core/mvc/ControllerExtension'], function (ControllerExtension) {
	'use strict';

	return ControllerExtension.extend('<%- ns %>.<%- name %>', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();

				// ... custom code here
			},
			viewState: {
				applyInitialStateOnly: function () {
					// ... custom code here
				}
			}
		},
		// you can add own formatter or helper
		formatMyField: function () {
			// ... custom code here
		},
		accept: function () {
			// ... custom code here
		},
		// !!! bundling formatters or event handlers into an object does not work
		formatter: {
			formatMyField: function () {
				// this method is not accessible
			}
		}
	});
});
