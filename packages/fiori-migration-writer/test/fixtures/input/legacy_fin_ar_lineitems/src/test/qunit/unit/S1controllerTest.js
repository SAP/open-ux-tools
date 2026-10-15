/*eslint-disable*/
module("S1controllerTest", {
	setup: function () {
		// to be filled if needed
	},
	teardown: function () {
		// to be filled if needed
	}
});

test("all ids in S1.view.xml need be in the fin.ar. namespace", function () {
	/*
	 * Background: All ids are globally (accross all running apps within the same browser window. If we use ids which are not within our namespace, we
	 * may pollute the namespace of other apps (or the framework) and thus cause a clash.
	 */

	var oRequest = jQuery.sap.sjax({
		url: jQuery.sap.getModulePath("fin.ar.lineitems.display") + "/view/S1.view.xml",
		dataType: "xml"
	});
	var doc;

	ok(oRequest.success, "XML file for S1.view needs to be retrieved");
	equal(typeof oRequest.data, 'object', "Data retrieved needs to be an object");

	doc = oRequest.data;

	var fNamespaceResolver = function (sPrefix) {
		if (sPrefix === "table") {
			return "sap.ui.table";
		}

		QUnit.assert.ok(false, "Unknown prefix requested: " + sPrefix);
		return undefined; // unknown prefix
	};

	var oCCNodes = doc.evaluate("//@id", doc, fNamespaceResolver, XPathResult.ANY_TYPE, null);

	var oNode = oCCNodes.iterateNext(); // get the first node

	while (oNode) {
		ok(/^fin\.ar\./.test(oNode.value), "id '" + oNode.value + "' needs to be in the fin.ar.* namespace");

		oNode = oCCNodes.iterateNext(); // get the next node
	}
})

test(
	"CrossNavigation outbound to ApplicationJob properly configured in manifest.json used by fin.arp.lib.lineitems.NavigationController.navigateToJobDetails() ",
	function () {
		/*
		 * to be able to navigate to the FinanceApplicationJob fin.arp.lib.lineitems.NavigationController.navigateToJobDetails()
		 * is relying on proper configuration of the "sap.app".crossNavigation.outbounds.scheduleJobs object in manifest.json
		 */
		var oRequest = jQuery.sap.sjax({
			url: jQuery.sap.getModulePath("fin.ar.lineitems.display") + "/manifest.json",
			dataType: "json"
		});
		ok(oRequest.success, "manifest.json retrieved");
		var manifest = oRequest.data;
		var oScheduleJobsConfig = manifest["sap.app"].crossNavigation.outbounds.scheduleJobs;
		ok(oScheduleJobsConfig.semanticObject === "FinanceApplicationJob",
			"crossNavigation.outbounds.scheduleJobs.semanticObject configured fin.arp.lib.lineitems.NavigationController.navigateToJobDetails() is relying on"
		);
		ok(oScheduleJobsConfig.action === "scheduleAccReceivableJobs",
			"crossNavigation.outbounds.scheduleJobs.action configured fin.arp.lib.lineitems.NavigationController.navigateToJobDetails() is relying on"
		);
		ok(oScheduleJobsConfig.parameters.JobCatalogEntryName.value.value === "SAP_FIN_AR_ITEM_MASS_CHANGE",
			"crossNavigation.outbounds.scheduleJobs.parameters.JobCatalogEntryName.value.value configured fin.arp.lib.lineitems.NavigationController.navigateToJobDetails() is relying on"
		)
	});