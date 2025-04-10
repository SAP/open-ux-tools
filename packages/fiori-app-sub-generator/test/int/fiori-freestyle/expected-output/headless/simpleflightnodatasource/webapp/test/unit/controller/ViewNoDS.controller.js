/*global QUnit*/

sap.ui.define([
	"simpleflightnodatasource/controller/ViewNoDS.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ViewNoDS Controller");

	QUnit.test("I should test the ViewNoDS controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
