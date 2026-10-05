/*eslint-disable*/
jQuery.sap.require({
	modName: "fin.ar.lineitems.display.view.S1",
	type: "controller"
});

module("S1controllerEnvTest which taints the environment", {
	setup: function() {
		startApp(false);
		var controller = getRunningApplicationView().getController();
		controller.getOwnerComponent().oComponentData = {};
	},
	teardown: function() {
		tearDownStubs();
		stopApp(false);

		sap.qunit.message.mocking.ensureCatchMessagesDisabled();
	}
});

test("onInit", function() {

	var oController = getRunningApplicationView().getController();
	var bInitFinished = false;

	var oStubInitDeferred = sinon.stub(oController.initDeferred, "resolve", function() {
		bInitFinished = true;
	});
	rememberStubToTearDown(oStubInitDeferred);

	oController.onInit();

	// just check some important objects and variables to be initialized
	assert.ok(oController.oView !== undefined, "View initialized");
	assert.ok(oController.oModel !== undefined, "Model initialized");
	assert.ok(oController.oTable !== undefined, "Table initialized");
	assert.ok(oController.oSmartFilterBar !== undefined, "FilterBar initialized");
	assert.ok(oController.oRouter !== undefined, "Router initialized");
	assert.ok(oController.oi18n !== undefined, "i18n initialized");
	assert.ok(oController.oi18nLib !== undefined, "i18nLib initialized");
	assert.ok(bInitFinished === true, "initDeferred resolved");
});

test("onBeforePopoverOpens", function() {
	var oController = getRunningApplicationView().getController();
	var bEventEqual = false;
	var bPathEqual = false;
	
	var oMyEvent = {
			getParameters: function() {
				return {
					semanticAttributes: {Customer: "C0001"}
				};
			}
		};
	
	var oStubCreatePopoverContent = sinon.stub(oController, "createPopoverContent", function(oEvent, sAddressDataPath){
		bEventEqual = oMyEvent === oEvent;
		bPathEqual =  sAddressDataPath === "/Customers(CustomerId='C0001')";
	});
	rememberStubToTearDown(oStubCreatePopoverContent);

	oController.onBeforePopoverOpens(oMyEvent);
	assert.ok(bEventEqual, "Event was passed over correctly");
	assert.ok(bPathEqual, "Path to Supplier composed correctly");
});