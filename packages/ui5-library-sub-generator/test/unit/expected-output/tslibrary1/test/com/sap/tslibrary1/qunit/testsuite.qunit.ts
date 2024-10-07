// eslint-disable-next-line no-undef
sap.ui.define(function() {
	"use strict";

	return {
		name: "QUnit TestSuite for com.sap.tslibrary1",
		defaults: {
			bootCore: true,
			ui5: {
				libs: "sap.ui.core,com.sap.tslibrary1",
				theme: "sap_fiori_3",
				noConflict: true,
				preload: "auto"
			},
			qunit: {
				version: 2,
				reorder: false
			},
			sinon: {
				version: 4,
				qunitBridge: true,
				useFakeTimers: false
			},
			module: "./{name}.qunit"
		},
		tests: {
			// test file for the Example control
			Example: {
				title: "QUnit Test for Example",
				_alternativeTitle: "QUnit tests: com.sap.tslibrary1.Example"
			}
		}
	};

});
