sap.ui.define(["sap/fe/core/PageController", "sap/ui/core/UIComponent"], function(PageController, UIComponent) {
	"use strict";

	return PageController.extend("sap.fe.core.fpmExplorer.customPageContent.CustomPage", {
		onPressed: function(oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
			this.routing.navigate(oContext);
		}
	});
});
