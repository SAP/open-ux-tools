/*eslint-disable*/
// code alias, relative path from testsuite.unit.html to the application code
jQuery.sap.require("fin.ar.lineitems.display.test.testsuite.ModulePathForTests");
fin.ar.lineitems.display.test.testsuite.ModulePathForTests.registerModulePathForTests("fin.ar.lineitems.display");
fin.ar.lineitems.display.test.testsuite.ModulePathForTests.registerLibraryPathForTests("sap.fin.arp.lib.lineitems");
fin.ar.lineitems.display.test.testsuite.ModulePathForTests.registerLibraryPathForTests("sap.fin.central.lib");

// ui5 resources alias
jQuery.sap.registerModulePath("", "../resources/");

// mock the call to sapui5 for displaying a message box
if (sap.ca === undefined)
	sap.ca = {};
if (sap.ca.ui === undefined)
	sap.ca.ui = {};
if (sap.ca.ui.message === undefined)
	sap.ca.ui.message = {};

// object for the Message Box mocking infrastructure
/*
 * Hint: do not name this object starting with sap.ca.ui.message. The scaffolding framework is quite aggressive in this namespace and may overwrite
 * your object on initialization.
 */
if (sap.qunit === undefined)
	sap.qunit = {};
if (sap.qunit.message === undefined)
	sap.qunit.message = {};
sap.qunit.message.mocking = {
	_messageBoxBuffer: [],
	_toastBuffer: [],

	enableCatchMessages: function() {
		var that = this;

		// --- MessageBox
		if (this.oldShowMessageBox === undefined) {
			// store old reference
			this.oldShowMessageBox = sap.m.MessageBox;

			// overwrite reference to sap.m.MessageBox
			sap.m.MessageBox.show = function(sText, mSettings) {
				var oMessageBox = {
					text: sText,
					type: mSettings.icon
				};
				// re-route call to Message Box Mocking Infrastructure
				that.addMessageBox(oMessageBox);
			};
		}

		// --- Message
		if (this.oldShowMessage === undefined) {
			// store old reference
			this.oldShowMessage = sap.ca.ui.message;

			// overwrite reference to sap.ca.ui.message
			sap.ca.ui.message.showMessageBox = function(oMessageBox) {
				// re-route call to Message Box Mocking Infrastructure
				that.addMessageBox(oMessageBox);
			};
		}
		;

		// --- Toast
		if (this.oldShowToast === undefined) {
			// store old reference
			this.oldShowToast = sap.m.MessageToast.show;

			// overwrite reference
			sap.m.MessageToast.show = function(sText) {
				that.addMessageToast(sText);
			};
		}
	},
	ensureCatchMessagesDisabled: function() {
		if (this.oldShowMessageBox !== undefined) {
			// Catching MessageBoxes is still enabled; restore the old state again!
			sap.m.MessageBox = this.oldShowMessageBox;
			this.oldShowMessageBox = undefined;
		}

		if (this.oldShowMessage !== undefined) {
			// Catching Messages is still enabled; restore the old state again!
			sap.ca.ui.message = this.oldShowMessage;
			this.oldShowMessage = undefined;
		}

		if (this.oldShowToast !== undefined) {
			// Catching Toast messages is still enabled; restore the old state again!
			sap.m.MessageToast.show = this.oldShowToast;
			this.oldShowToast = undefined;
		}

	},
	addMessageBox: function(oMessageBox) {
		this._messageBoxBuffer.push(oMessageBox);
	},
	addMessageToast: function(sText) {
		this._toastBuffer.push(sText);
	},

	pullAllToasts: function() {
		var buffer = this._toastBuffer;
		this._toastBuffer = [];
		return buffer;
	},
	pullAllMessages: function() {
		var buffer = this._messageBoxBuffer;
		// make buffer clean again, as all entries have been pulled
		this._messageBoxBuffer = [];
		return buffer;
	},
	checkAtLeastOneToastAndReset: function(sErrorMessage) {
		var atLeastOneMessage = this._toastBuffer.length > 0;
		assert.ok(atLeastOneMessage, sErrorMessage || "At least one toast message has been triggered");
		this._toastBuffer.length = [];
		return atLeastOneMessage;
	},
	checkAtLeastOneMessageAndReset: function(sErrorMessage) {
		var atLeastOneMessage = this._messageBoxBuffer.length > 0;
		assert.ok(atLeastOneMessage, sErrorMessage || "At least one message box has been triggered");
		this._messageBoxBuffer = [];
		return atLeastOneMessage;
	},
	checkAtLeastOneErrorMessageAndReset: function(sErrorMessage) {
		var atLeastOneError = false;

		jQuery.each(this._messageBoxBuffer, function(index, value) {
			if (value && (value.type === sap.m.MessageBox.Icon.ERROR || value.type === sap.ca.ui.message.Type.ERROR))
				atLeastOneError = true;
		});

		assert.ok(atLeastOneError, sErrorMessage || "At least one error message box has been raised");
		this._messageBoxBuffer = [];
		return atLeastOneError;
	},
	checkAtLeastOneWarningMessageAndReset: function(sErrorMessage) {
		var atLeastOneWarning = false;

		jQuery.each(this._messageBoxBuffer, function(index, value) {
			if (value && (value.type === sap.m.MessageBox.Icon.WARNING || value.type === sap.ca.ui.message.Type.WARNING))
				atLeastOneWarning = true;
		});

		assert.ok(atLeastOneWarning, sErrorMessage || "At least one warning message box has been raised");
		this._messageBoxBuffer = [];
		return atLeastOneWarning;
	},
	checkAtLeastOneSuccessMessageAndReset: function(sErrorMessage) {
		var atLeastOneSuccess = false;

		jQuery.each(this._messageBoxBuffer, function(index, value) {
			if (value && (value.type === sap.m.MessageBox.Icon.SUCCESS || value.type === sap.ca.ui.message.Type.SUCCESS))
				atLeastOneSuccess = true;
		});

		assert.ok(atLeastOneSuccess, sErrorMessage || "At least one success message box has been raised");
		this._messageBoxBuffer = [];
		return atLeastOneSuccess;
	},
	checkAtLeastOneInfoMessageAndReset: function(sErrorMessage) {
		var atLeastOneInfo = false;

		jQuery.each(this._messageBoxBuffer, function(index, value) {
			if (value && (value.type === sap.m.MessageBox.Icon.INFORMATION || value.type === sap.ca.ui.message.Type.INFO))
				atLeastOneInfo = true;
		});

		assert.ok(atLeastOneInfo, sErrorMessage || "At least one info message box has been raised");
		this._messageBoxBuffer = [];
		return atLeastOneInfo;
	},
	checkNoErrorMessageAndReset: function(sErrorMessage) {
		var bHasError = false;

		jQuery.each(this._messageBoxBuffer, function(index, value) {
			if (value && (value.type === sap.m.MessageBox.Icon.ERROR || value.type === sap.ca.ui.message.Type.ERROR))
				bHasError = true;
		});

		assert.ok(!bHasError, sErrorMessage || "No error message box has been raised");
		this._messageBoxBuffer = [];
		return bHasError;
	}
};

// checks for BusyIndicator
sap.qunit.BusyIndicatorCheck = {
	counterShow: 0,
	counterHide: 0,
	oldBusyIndicatorShow: undefined,
	oldBusyIndicatorHide: undefined,
	catchAllTriggers: function() {
		var that = this;

		if (this.oldBusyIndicatorShow !== undefined) {
			return; // already registered
		}

		this.oldBusyIndicatorShow = sap.ui.core.BusyIndicator.show;
		sap.ui.core.BusyIndicator.show = function() {
			that.counterShow++;
		};

		this.oldBusyIndicatorHide = sap.ui.core.BusyIndicator.hide;
		sap.ui.core.BusyIndicator.hide = function() {
			if (that.counterHide >= that.counterShow)
				ok(false, "call to BusyIndicator.hide without having any call to show");

			that.counterHide++;
		};
	},
	checkIfAllClosed: function() {
		QUnit.equals(this.counterShow, this.counterHide, "BusyIndicator needs to be closed as many times, as it has been opened");
	},
	reset: function() {
		this.counterShow = 0;
		this.counterHide = 0;
	}
};

// helper methods for the reuse library tests
function getPrefix() {
	return "fin.ar.lineitems.display";
};

function getContainerKey() {
	return "fin.ar.lineitems";
}

function getODataServiceName() {
	return "FAR_CUSTOMER_LINE_ITEMS";
}