// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/*global QUnit */
// eslint-disable-next-line no-undef
sap.ui.define([
	"sap/ui/qunit/QUnitUtils",
	"sap/ui/qunit/utils/createAndAppendDiv",
	"<%= libraryNamespaceURI %>/library",
	"<%= libraryNamespaceURI %>/Example"
], function(qutils, createAndAppendDiv, library, Example) {
	"use strict";

	// refer to library types
	const ExampleColor = library.ExampleColor;

	// prepare DOM
	createAndAppendDiv("uiArea1");

	// module for basic checks
	QUnit.module("Example Tests");

	// example sync test
	QUnit.test("Sync", function(assert) {
		assert.expect(1);
		assert.ok(true, "ok");
	});

	// example async test
	QUnit.test("Async", function(assert) {
		assert.expect(1);
		return new Promise(function(resolve, reject) {
			assert.ok(true, "ok");
			resolve();
		});
	})

	// module for basic checks
	QUnit.module("Basic Control Checks");

	// some basic control checks
	QUnit.test("Test get properties", function(assert) {
		assert.expect(2);
		const oExample = new Example({
			text: "Example"
		});
		assert.equal(oExample.getText(), "Example", "Check text equals 'Example'");
		assert.equal(oExample.getColor(), ExampleColor.Default, "Check color equals 'Default'");
	});

	// some basic eventing check
	QUnit.test("Test click event", function(assert) {
		assert.expect(1);
		const oExample = new Example("example", {
			text: "Example",
			press: function() {
				assert.ok(true, "Event has been fired!")
			}
		}).placeAt("uiArea1");
		return new Promise(function(resolve, reject) {
			setTimeout(function() {
				qutils.triggerMouseEvent("example", "click", 1, 1);
        resolve();
			}, 100);
		});
	});

});
