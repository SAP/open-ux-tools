// define a root UIComponent which exposes the main view
sap.ui.define(["sap/ui/core/UIComponent","sap/ui/Device","sap/fin/arp/lib/lineitems/util/ErrorHandler"],
	function(UIComponent,Device,ErrorHandler){
		"use strict";
	
		return UIComponent.extend("fin.ar.lineitems.display.Component", {
			metadata : {
				manifest: "json"
			},
		
           /**
           * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
           * In this function, the resource and application models are set and the router is initialized.
           * @public
           * @override
           */
			init : function() {
				UIComponent.prototype.init.apply(this,arguments);
				this.oErrorHandler = new ErrorHandler(this);
				this.getRouter().initialize();
			},
			
           /**
           * In this function, the rootView is initialized and stored.
           * @public
           * @override
           * @returns {sap.ui.mvc.View} the root view of the component
           */
           createContent : function() {
               var oRootView = UIComponent.prototype.createContent.apply(this, arguments);
               oRootView.addStyleClass(this.getContentDensityClass());
               return oRootView;
           },

           /**
           * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy design mode class should be set, which influences the size appearance of some controls.
           * @public
           * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy'
           */
			getContentDensityClass : function() {
				/*SAPi
				 * see rollout in wiki: https://wiki.wdf.sap.corp/wiki/display/ERPFINDEV/sFIN+UX+Fiori+Guidelines#sFINUXFioriGuidelines-DesktopFormFactor
				SAPi*/
				if (this._sContentDensityClass === undefined) {
					// check whether FLP has already set the content density class; do nothing in this case
					if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
						this._sContentDensityClass = "";
					} else if (!Device.support.touch) {
						// apply "compact" mode if touch is not supported
						this._sContentDensityClass = "sapUiSizeCompact";
					} else {
						// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
						this._sContentDensityClass = "sapUiSizeCozy";
					}
				}
				return this._sContentDensityClass;
			}
		});
	}
);