sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"./Common"
], function (Opa5, Press, PropertyStrictEquals, Common) {
	"use strict";

	var sViewName = "Object";

	Opa5.createPageObjects({
		onTheObjectPage: {
			baseClass : Common,

			actions : Object.assign({
				iPressTheBackButton : function () {
					return this.waitFor({
						id : "page",
						viewName : sViewName,
						actions: new Press(),
						errorMessage : "Did not find the nav button on object page"
					});
				}

			}, ),

			assertions: Object.assign({

				iShouldSeeTheRememberedObject : function () {
					return this.waitFor({
						success : function () {
							var sBindingPath = this.getContext().currentItem.bindingPath;
							this.waitFor({
								id : "page",
								viewName : sViewName,
								matchers : function (oPage) {
									return oPage.getBindingContext() && oPage.getBindingContext().getPath() === sBindingPath;
								},
								success : function (oPage) {
									Opa5.assert.strictEqual(oPage.getBindingContext().getPath(), sBindingPath, "was on the remembered detail page");
								},
								errorMessage : "Remembered object " + sBindingPath + " is not shown"
							});
						}
					});
				},


			}, )

		}

	});

});