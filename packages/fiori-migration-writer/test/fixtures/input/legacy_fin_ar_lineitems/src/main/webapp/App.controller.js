sap.ui.define(["sap/fin/arp/lib/lineitems/controller/AbstractController"], 
	function (AbstractController) {
		"use strict";
		return AbstractController.extend("fin.ar.lineitems.display.App", {
			onInit : function () {
				// apply content density mode to root view
				this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			}
	});
});