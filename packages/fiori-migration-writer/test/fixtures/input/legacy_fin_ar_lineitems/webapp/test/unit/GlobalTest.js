/*eslint-disable*/
module("GlobalTest", {
	setup: function() {
	},
	teardown: function() {
	}
});

test("Global: fin.ap.line may not appear in source files", function() {
	var checkFile = function(sFilePath) {
		var oRequest = jQuery.sap.sjax({
			url: jQuery.sap.getModulePath("fin.ar.lineitems.display") + "/" + sFilePath,
			dataType: "text"
		});
		ok(oRequest.success, "Data of file " + sFilePath + " needs to be available");
		ok(typeof oRequest.data === 'string', "Data of file " + sFilePath + " needs to be retrieved");

		var regexp = /fin\.ap\.line/ig;
		ok(!regexp.test(oRequest.data), "the String 'fin.ap.line' must not be used in " + sFilePath);
	};

	var aFiles = [
		"view/S1.view.xml", "view/S1.controller.js", "App.controller.js", "App.view.xml", "Component.js"
	];

	for (var i = 0; i < aFiles.length; i++) {
		checkFile(aFiles[i]);
	}
});