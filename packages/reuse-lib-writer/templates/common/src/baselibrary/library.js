/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library <%= librarynamespace %>.
 */
sap.ui.define([
	"sap/ui/core/library"
], function () {
	"use strict";

	// delegate further initialization of this library to the Core
	// Hint: sap.ui.getCore() must still be used to support preload with sync bootstrap!
	sap.ui.getCore().initLibrary({
		name: "<%= librarynamespace %>",
		version: "${version}",
		dependencies: [ // keep in sync with the ui5.yaml and .library files
			"sap.ui.core"
		],
		types: [
			"<%= librarynamespace %>.ExampleColor"
		],
		interfaces: [],
		controls: [
			"<%= librarynamespace %>.Example"
		],
		elements: [],
		noLibraryCSS: false // if no CSS is provided, you can disable the library.css load here
	});

	/**
	 * Some description about <code><%= libraryname %></code>
	 *
	 * @namespace
	 * @name <%= librarynamespace %>
	 * @author <%= author %>
	 * @version ${version}
	 * @public
	 */
	var thisLib = <%= librarynamespace %>;

	/**
	 * Semantic Colors of the <code><%= librarynamespace %>.Example</code>.
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
