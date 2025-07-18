sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"./Common",
	"sap/ui/test/actions/EnterText",
	"sap/ui/test/matchers/AggregationLengthEquals",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals"
], function(Opa5, Press, Common, EnterText, AggregationLengthEquals, AggregationFilled, PropertyStrictEquals) {
	"use strict";

	var sViewName = "List";

	Opa5.createPageObjects({
		onTheMasterPage : {

			baseClass : Common,

			actions : {
				
				iRememberTheIdOfListItemAtPosition : function (iPosition) {
					return this.waitFor({
						id : "list",
						viewName : sViewName,
						matchers : function (oList) {
							return oList.getItems()[iPosition];
						},
						success : function (oListItem) {
							this.iRememberTheListItem(oListItem);
						},
						errorMessage : "The list does not have an item at the index " + iPosition
					});
				},

				iPressOnTheObjectAtPosition : function (iPositon) {
					return this.waitFor({
						id : "list",
						viewName : sViewName,
						matchers : function (oList) {
							return oList.getItems()[iPositon];
						},
						actions : new Press(),
						errorMessage : "List 'list' in view '" + sViewName + "' does not contain an ObjectListItem at position '" + iPositon + "'"
					});
				},
				iSearchForTheFirstObject : function (){
					var sFirstObjectTitle;
					return this.waitFor({
						id : "list",
						viewName : sViewName,
						matchers: new AggregationFilled({name : "items"}),
						success : function (oList) {
							sFirstObjectTitle = oList.getItems()[0].getTitle();
							return this.iSearchForValue(new EnterText({text: sFirstObjectTitle}), new Press());
						},
						errorMessage : "Did not find list items while trying to search for the first item."
					});
				},

				iSearchForValue : function (aActions) {
					return this.waitFor({
						id : "searchField",
						viewName : sViewName,
						actions: aActions,
						errorMessage : "Failed to find search field in List view.'"
					});
				},

				iClearTheSearch : function () {
					//can not use 'EnterText' action to enter empty strings (yet)
					var fnClearSearchField = function(oSearchField) {
						oSearchField.clear();
					};
					return this.iSearchForValue([fnClearSearchField]);
				},

				iRememberTheListItem : function (oListItem) {
					var oBindingContext = oListItem.getBindingContext();
					this.getContext().currentItem = {
						bindingPath: oBindingContext.getPath(),
						id: oBindingContext.getProperty("UnitOfMeasure"),
						title: oBindingContext.getProperty("UnitOfMeasureISOCode")
					};
				}
			},

			assertions : {

				iShouldSeeTheList : function () {
					return this.waitFor({
						id : "list",
						viewName : sViewName,
						success : function (oList) {
							Opa5.assert.ok(oList, "Found the object List");
						},
						errorMessage : "Can't see the list."
					});
				},

				theListShowsOnlyObjectsWithTheSearchStringInTheirTitle : function () {
					this.waitFor({
						id : "list",
						viewName : sViewName,
						matchers : new AggregationFilled({name : "items"}),
						check : function(oList) {
							var sTitle = oList.getItems()[0].getTitle(),
								bEveryItemContainsTheTitle = oList.getItems().every(function (oItem) {
									return oItem.getTitle().indexOf(sTitle) !== -1;
								});
							return bEveryItemContainsTheTitle;
						},
						success : function (oList) {
							Opa5.assert.ok(true, "Every item did contain the title");
						},
						errorMessage : "The list did not have items"
					});
				},

				iShouldSeeTheNoDataTextForNoSearchResults : function () {
					return this.waitFor({
						id : "list",
						viewName : sViewName,
						success : function (oList) {
							Opa5.assert.strictEqual(oList.getNoDataText(), oList.getModel("i18n").getProperty("masterListNoDataWithFilterOrSearchText"), "the list should show the no data text for search and filter");
						},
						errorMessage : "list does not show the no data text for search and filter"
					});
				},

				theListShouldHaveNoSelection : function () {
					return this.waitFor({
						id : "list",
						viewName : sViewName,
						matchers : function(oList) {
							return !oList.getSelectedItem();
						},
						success : function (oList) {
							Opa5.assert.strictEqual(oList.getSelectedItems().length, 0, "The list selection is removed");
						},
						errorMessage : "List selection was not removed"
					});
				}
			}
		}
	});
});