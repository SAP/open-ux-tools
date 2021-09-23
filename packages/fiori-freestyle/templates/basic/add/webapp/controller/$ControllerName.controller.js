sap.ui.define([
	"sap/ui/core/mvc/Controller"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller) {
		"use strict";

		return Controller.extend("<%=app.id%>.controller.<%= ui5.initialControllerName ? ui5.initialControllerName : 'View1' %>", {
			onInit: function () {

			}
		});
	});
