sap.ui.define([
	"sap/ui/test/Opa5",
	"./Common"
], function(Opa5, Common) {
	"use strict";

	Opa5.createPageObjects({
		onTheBrowser : {
			baseClass : Common,

			actions : {

				iPressOnTheBackwardsButton : function () {
					return this.waitFor({
						success : function () {
							// manipulate history directly for testing purposes
							Opa5.getWindow().history.back();
						}
					});
				},

				iPressOnTheForwardsButton : function () {
					return this.waitFor({
						success : function () {
							// manipulate history directly for testing purposes
							Opa5.getWindow().history.forward();
						}
					});
				}
			},

			assertions: {}
		}

	});
});