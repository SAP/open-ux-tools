/*!
 * ${copyright}
 */

sap.ui.define([
	"sap/ui/core/Lib",
	"./library"
], function (Lib, library) {
	"use strict";

	// refer to library types
	var ExampleColor = library.ExampleColor;

	/**
	 * Example renderer.
	 * @namespace
	 */
	var ExampleRenderer = {
		apiVersion: 2 // usage of DOM Patcher
	};

	/**
	 * Renders the HTML for the given control, using the provided
	 * {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} rm The reference to the <code>sap.ui.core.RenderManager</code>
	 * @param {sap.ui.core.Control} control The control instance to be rendered
	 */
	ExampleRenderer.render = function (rm, control) {

		var i18n = Lib.getResourceBundleFor("<%= libraryNamespace %>");

		rm.openStart("div", control);
		if (control.getColor() === ExampleColor.Highlight) {
			rm.class("myLibPrefixExampleHighlight");
		} else {
			rm.class("myLibPrefixExample");
		}
		rm.openEnd( );
		rm.text(i18n.getText("ANY_TEXT") + ": " + control.getText());
		rm.close("div");

	};

	return ExampleRenderer;

});
