sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"./Common",
	"sap/ui/test/matchers/AggregationLengthEquals",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals"
], function(Opa5, Press, Common, AggregationLengthEquals, AggregationFilled, PropertyStrictEquals) {
	"use strict";

	var sViewName = "Detail";

	Opa5.createPageObjects({
		onTheDetailPage : {

			baseClass : Common,

			actions : {


			},

			assertions : {

				iShouldSeeTheRememberedObject : function () {
					return this.waitFor({
						success : function () {
							var sBindingPath = this.getContext().currentItem.bindingPath;
							this._waitForPageBindingPath(sBindingPath);
						}
					});
				},

				_waitForPageBindingPath : function (sBindingPath) {
					return this.waitFor({
						id : "detailPage",
						viewName : sViewName,
						matchers : function (oPage) {
							return oPage.getBindingContext() && oPage.getBindingContext().getPath() === sBindingPath;
						},
						success : function (oPage) {
							Opa5.assert.strictEqual(oPage.getBindingContext().getPath(), sBindingPath, "was on the remembered detail page");
						},
						errorMessage : "Remembered object " + sBindingPath + " is not shown"
					});
				},

				iShouldSeeTheObjectLineItemsList : function () {
					return this.waitFor({
						id : "lineItemsList",
						viewName : sViewName,
						success : function (oList) {
							Opa5.assert.ok(oList, "Found the line items list.");
						}
					});
				},


				iShouldSeeHeaderActionButtons: function () {
					return this.waitFor({
						id : ["closeColumn", "enterFullScreen"],
						viewName : sViewName,
						success : function () {
							Opa5.assert.ok(true, "The action buttons are visible");
						},
						errorMessage : "The action buttons were not found"
					});
				}

			}

		}

	});

});
