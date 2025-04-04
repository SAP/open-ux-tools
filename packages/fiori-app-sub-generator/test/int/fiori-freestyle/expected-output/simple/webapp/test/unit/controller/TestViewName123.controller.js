/*global QUnit*/

sap.ui.define([
	"simplenamespace/simple/controller/TestViewName123.controller"
], function (Controller) {
	"use strict";

	QUnit.module("TestViewName123 Controller");

	QUnit.test("I should test the TestViewName123 controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
