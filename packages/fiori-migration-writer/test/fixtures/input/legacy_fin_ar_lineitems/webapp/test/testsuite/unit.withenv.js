/*eslint-disable*/
QUnit.config.testTimeout = 600000;

QUnit.isAppRunning = false;
QUnit.runningStubs = [];

QUnit.log(function(details) {
	if (details.result) {
		// if it went ok, do do anything
		return;
	}

	QUnit.failureOccurred = true;
});

jQuery.sap.require("fin.ar.lineitems.display.test.unit.model.MockServer");
fin.ar.lineitems.display.test.unit.model.MockServer.init(this);

// Application Processing
function startApp(bTainted) {

	QUnit.additionalTestsAddedByFramework = 0;

	if (QUnit.failureOccurred) {
		// if at least one test failure occurred, the environment is always tainted
		bTainted = true;
	}

	if (bTainted === undefined) {
		bTainted = true;
	}

	if (!QUnit.isAppRunning) {
		bTainted = true;
	}

	if (!bTainted) {
		QUnit._appIsTainted = true;
		return;
	}

	var oComponentContainer = new sap.ui.core.ComponentContainer({
		height: "100%",
		name: "fin.ar.lineitems.display"
	});

	sap.qunit.message.mocking.enableCatchMessages();

	oComponentContainer.placeAt("content");
	sap.ui.getCore().applyChanges();

	sap.qunit.message.mocking.checkNoErrorMessageAndReset("No error message box during initialization");
	QUnit.additionalTestsAddedByFramework = 1;

	sap.qunit.runningApplicationComponentContainer = oComponentContainer;

	// test environment is clean again
	QUnit.isAppRunning = true;
	QUnit.failureOccurred = false;
}

function stopApp(bTainted) {

	sap.qunit.message.mocking.checkNoErrorMessageAndReset("No unhandled error message box during test execution");

	if (QUnit.failureOccurred) {
		// if at least one test failure occurred, the environment is always tainted
		bTainted = true;
	}

	if (bTainted === undefined) {
		bTainted = true;
	}

	if (!bTainted) {
		return;
	}

	QUnit.isAppRunning = false;

	var oComponentContainer = sap.qunit.runningApplicationComponentContainer;
	oComponentContainer.destroy();
	sap.ui.getCore().applyChanges();

}

function rememberStubToTearDown(oStub) {
	QUnit.runningStubs.push(oStub);
}

function tearDownStubs() {
	var i, oStub;
	for (i = 0; i < QUnit.runningStubs.length; i++) {
		oStub = QUnit.runningStubs[i];
		oStub.restore();
	}
	QUnit.runningStubs = [];
}

function getRunningApplicationView() {
	var comp = sap.qunit.runningApplicationComponentContainer.getComponentInstance();
	var mainView = comp.getAggregation("rootControl");
	var mainContent = mainView.getContent()[0];
	var page = mainContent.getPages()[0];
	
	return page;
	/*
	var pagesContent = page.getAggregation("content")[0];
	var appPages = pagesContent.getAggregation("pages");

	var pageIdx = -1;
	for (var i = 0; i < appPages.length; i++) {
		if (appPages[i].getMetadata().getName() === 'sap.ui.core.mvc.XMLView')
			pageIdx = i;
	}

	return appPages[pageIdx];
	*/
}

// tests to run
jQuery.sap.require("fin.ar.lineitems.display.test.unit.S1controllerEnvTest");