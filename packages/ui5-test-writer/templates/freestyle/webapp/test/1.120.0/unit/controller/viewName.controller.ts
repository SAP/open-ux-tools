/*global QUnit*/
import Controller from "<%= appIdWithSlash %>/controller/<%= viewName %>.controller";

QUnit.module("<%= viewName %> Controller");

QUnit.test("I should test the <%= viewName %> controller", function (assert: Assert) {
	const oAppController = new Controller("<%= viewName %>");
	oAppController.onInit();
	assert.ok(oAppController);
});