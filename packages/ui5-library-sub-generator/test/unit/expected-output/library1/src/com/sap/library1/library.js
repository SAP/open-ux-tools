/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library com.sap.library1.
 */
sap.ui.define([
	"sap/ui/core/library"
], function () {
	"use strict";

	// delegate further initialization of this library to the Core
	// Hint: sap.ui.getCore() must still be used to support preload with sync bootstrap!
	sap.ui.getCore().initLibrary({
		name: "com.sap.library1",
		version: "${version}",
		dependencies: [ // keep in sync with the ui5.yaml and .library files
			"sap.ui.core"
		],
		types: [
			"com.sap.library1.ExampleColor"
		],
		interfaces: [],
		controls: [
			"com.sap.library1.Example"
		],
		elements: [],
		noLibraryCSS: false // if no CSS is provided, you can disable the library.css load here
	});

	/**
	 * Some description about <code>library1</code>
	 *
	 * @namespace
	 * @name com.sap.library1
	 * @author Fiori tools
	 * @version ${version}
	 * @public
	 */
	var thisLib = com.sap.library1;

	/**
	 * Semantic Colors of the <code>com.sap.library1.Example</code>.
	 *
	 * @enum {string}
	 * @public
	 */
	thisLib.ExampleColor = {

		/**
		 * Default color (brand color)
		 * @public
		 */
		Default : "Default",

		/**
		 * Highlight color
		 * @public
		 */
		Highlight : "Highlight"

	};

	return thisLib;

});
