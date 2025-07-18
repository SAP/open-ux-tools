sap.ui.define([
	"sap/ui/test/Opa5"
], function(Opa5) {
	"use strict";

	var sViewName = "App",
		sAppId = "app";
	Opa5.createPageObjects({
		onTheAppPage: {

			actions: {},

			assertions: {

				iShouldSeeTheApp: function () {
					return this.waitFor({
						id: sAppId,
						viewName: sViewName,
						success: function () {
							Opa5.assert.ok(true, "The App view is displayed");
						},
						errorMessage: "Did not find the App view"
					});
				}
			}
		}
	});
});
