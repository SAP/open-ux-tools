/*
 * ! ${copyright}
 */

sap.ui.define([
	"sap/fin/arp/lib/lineitems/controller/AbstractController",
	"sap/m/MessageBox"],
	function(AbstractController, MessageBox){
		"use strict";

		var S1Controller = sap.fin.arp.lib.lineitems.controller.AbstractController.extend(
			"fin.ar.lineitems.display.view.S1", {
			/**
			 * @memberOf fin.ar.lineitems.display.view.S1.controller
			 */

			constructor: function() {
				AbstractController.apply(this, arguments);
				this.sLocalContainerKey = "fin.ar.lineitems";
				this.sPrefix = "fin.ar.lineitems.display";
				this.sIconPath = "sap-icon://Fiori5/F0711";
				this.sOwnSemanticObject = "Customer";
				this.sCustomerVendorItemTypeKey = "V";
				this.initDeferred = jQuery.Deferred();
			},

			onInit: function() {
				AbstractController.prototype.onInit.apply(this, arguments);
				this.setExtendedFooterOptions();
			},
			
			onExit: function() {
				this.cleanUpNavController();
			},

			onInitSmartFilterBar: function() {
				var that = this;
				this.initDeferred.done(function(){
					AbstractController.prototype.onInitSmartFilterBar.apply(that, arguments);
					that.checkForNavigation();
				});
			},

			onNavTargetsObtained: function(oEvent) {
				this.openPopover(oEvent, this.oi18n.getText("POPOVER_CLI_LINK"));
			},

			onBeforePopoverOpens: function(oEvent) {
				// This event handler is called, when a smart link is clicked.
				var sCustomer = oEvent.getParameters().semanticAttributes.Customer;
				var sAddressDataPath = "/Customers(CustomerId='" + encodeURIComponent(sCustomer) + "')";
				this.createPopoverContent(oEvent, sAddressDataPath);
			},

			onButtonPressedSendCorrespondence: function() {
				if (this.aSelectedKeys.length <= this.MAX_NUMBER_OF_ITEMS) {
					this.sendCorrespondence("D", "Customer");
				} else {
					MessageBox.information(this.oi18nLib.getText("NO_ITEM_CHANGE_LIMIT", this.MAX_NUMBER_OF_ITEMS));
				}
			},
			
			onBeforeRendering: function() {
				// The "onBeforeRendering" event handler must be defined in the S1.controller, not in the AbstractController.
				// The "this" variable has a different context, if onBeforeRendering is directly defined in the AbstractController.
				this.onBeforeViewRendering();
			},
			
			setExtendedFooterOptions: function(){
				/**
				 * @ControllerHook Allows modification of the footer area. Implement this hook if you wish to add new buttons to the footer bar. 
				 * The hook is called onInit when the footer options are defined.
				 * Example of adding a button in extHookModifyFooterOptions:
				 * 
				 * extHookModifyFooterOptions: function(oOptions) {
				 *	var fnOnBtnPressed = function() { 
				 *							this.oSmartFilterBar.search();
				 *						};
				 *
				 *	var fnCalcEnabled = function(oController) {
				 *							return oController.aSelectedKeys.length >= 1;
				 *						}; //optional function which returns true or false
				 *
				 *	var myButton = { sId: "myButton", 
				 *					sI18nBtnTxt: "My Button",
				 *					bDisabled: false,
				 *					onBtnPressed: jQuery.proxy(fnOnBtnPressed,this),
				 *					calcEnabled: fnCalcEnabled
				 *					};
				 *
				 *	oOptions.buttonList.push(myButton);
				 *	return oOptions;
				 * }
				 * 
				 * @callback sap.ca.scfld.md.controller.BaseFullscreenController~extHookModifyFooterOptions
				 * @param {Object} oOptions: Object containing the buttonList array
				 * @return {Object} oOptions: modified footer options in the same format as the parameter. Note that the return parameter must contain the complete object
				 */
				 
				if (this.extHookModifyFooterOptions) {
					var oOptions = this.extHookModifyFooterOptions({buttonList: []});
					if(oOptions.buttonList && oOptions.buttonList.length > 0){
						this.addExtensionButtons(oOptions);
					}
				}
			}
		});
		
		return S1Controller;
	}, /* bExport= */true);