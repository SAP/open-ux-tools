// eslint-disable-next-line no-undef
sap.ui.define([
	"com/sap/library1/library",
	"com/sap/library1/Example"
], function(library, Example) {
	"use strict";

	// refer to library types
	var ExampleColor = library.ExampleColor;

	// create a new instance of the Example control and
	// place it into the DOM element with the id "content"
	new Example({
			text: "Example",
			color: ExampleColor.Highlight
	}).placeAt("content");

});
