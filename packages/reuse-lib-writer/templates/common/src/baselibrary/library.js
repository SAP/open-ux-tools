/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library <%= libraryNamespace %>.
 */
sap.ui.define([
	"sap/ui/core/library"
], function () {
	"use strict";

	// delegate further initialization of this library to the Core
	// Hint: sap.ui.getCore() must still be used to support preload with sync bootstrap!
	sap.ui.getCore().initLibrary({
		name: "<%= libraryNamespace %>",
		version: "${version}",
		dependencies: [ // keep in sync with the ui5.yaml and .library files
			"sap.ui.core"
		],
		types: [
			"<%= libraryNamespace %>.ExampleColor"
		],
		interfaces: [],
		controls: [
			"<%= libraryNamespace %>.Example"
		],
		elements: [],
		noLibraryCSS: false // if no CSS is provided, you can disable the library.css load here
	});

	/**
	 * Some description about <code><%= libraryName %></code>
	 *
	 * @namespace
	 * @name <%= libraryNamespace %>
	 * @author <%= author %>
	 * @version ${version}
	 * @public
	 */
	var thisLib = <%= libraryNamespace %>;

	/**
	 * Semantic Colors of the <code><%= libraryNamespace %>.Example</code>.
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
