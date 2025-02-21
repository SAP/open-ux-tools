/*global QUnit*/

sap.ui.define([
	"<%= appIdWithSlash %>/controller/<%= viewName %>.controller"
], function (Controller) {
	"use strict";

	QUnit.module("<%= viewName %> Controller");

	QUnit.test("I should test the <%= viewName %> controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
