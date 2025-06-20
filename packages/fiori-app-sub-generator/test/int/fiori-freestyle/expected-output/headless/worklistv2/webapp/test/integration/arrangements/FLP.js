/* eslint-disable fiori-custom/sap-no-proprietary-browser-api */
sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/core/routing/HashChanger",
	"sap/ui/dom/includeStylesheet"
], function (Opa5, HashChanger, includeStylesheet) {
	"use strict";

	/**
	 *  Manually set OPA styles when running test with the FLP Sandbox.
	 *  Function is executed after DOM is available
	 *  */
	function fnSetupFLPStyles() {
		// include standard OPA styles
		includeStylesheet(sap.ui.require.toUrl("sap/ui/test/OpaCss.css"));

		// limit app to 80% screen size to see QUnit test results
		var oBody = document.body;
		oBody.style.width = "80%";
		oBody.style.left = "20%";
		oBody.style.position = "absolute";

		// set OPA component class
		if (!oBody.classList.contains("sapUiOpaBodyComponent")) {
			oBody.classList.add("sapUiOpaBodyComponent");
		}

		// append "content" div on body (when using karma as test runner)
		// eslint-disable-next-line fiori-custom/sap-no-dom-access
		var oDiv = document.getElementById("content");
		if (!oDiv) {
			// eslint-disable-next-line fiori-custom/sap-no-element-creation
			oDiv = document.createElement("div");
			oDiv.setAttribute("id", "content");
			// eslint-disable-next-line fiori-custom/sap-no-dom-insertion
			oBody.appendChild(oDiv);
		}
		oDiv.style.width = "80%";
	}
	// eslint-disable-next-line no-unused-expressions
	document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fnSetupFLPStyles) : fnSetupFLPStyles();

	return Opa5.extend("worklistv2.test.integration.arrangements.FLP", {
		/**
		 * Navigating to home screen to unload the app component
		 * @returns {sap.ui.test.Opa5.waitFor} Assertion that is always executed
		 */
		iLeaveMyFLPApp: function () {
			return this.waitFor({
				success: function () {
					new HashChanger().setHash("Shell-home");
				}
			});
		}
	});

});