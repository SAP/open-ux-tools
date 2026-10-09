jQuery.sap.declare("fin.ar.lineitems.display.test.unit.model.MockServer");
jQuery.sap.require("sap.ui.core.util.MockServer");

fin.ar.lineitems.display.test.unit.model.MockServer = {
	init: function(context) {
		// recommendation from Gal Roter (Wed 24.06.2015 11:59 GMT+1) to use an own mockserver to handle the lrep requests
		var oMockServer = new sap.ui.core.util.MockServer({
			rootUri: "/sap/bc/lrep/",
			requests: [
				{
					method: "HEAD",
					path: /actions\/getcsrftoken\/.*/,
					response: function(oXhr) {
						oXhr.respond(204);
						return true;
					}
				}, {
					method: "GET",
					path: /flex\/data\/.*/,
					response: function(oXhr) {
						oXhr.respond(200, {
							"Content-Type": "application/json;charset=utf-8"
						}, JSON.stringify({
							"changes": [],
							"settings": {
								"isKeyUser": true,
								"isAtoAvailable": true,
								"isAtoEnabled": false,
								"isProductiveSystem": false
							}
						}));
						return true;
					}
				}
			]
		});
		oMockServer.start();
		
		var oMockServerOData = new sap.ui.core.util.MockServer({
			rootUri: "/sap/opu/odata/sap/FAR_CUSTOMER_LINE_ITEMS/"
		});
		
		var sModelBaseUrl = jQuery.sap.getModulePath("fin.ar.lineitems.display") + "/model";
		
		oMockServerOData.simulate(sModelBaseUrl + "/metadata.xml", {
			bGenerateMissingMockData: false,
			sMockdataBaseUrl: sModelBaseUrl
		});
		oMockServerOData.start();
	}
};