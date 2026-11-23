jQuery.sap.declare("fin.co.costcenter.manage_test.mocks.MockInfrastructure");

fin.co.costcenter.manage_test.mocks.MockInfrastructure = function() {
	this.sinons = [];
	this.oMock = _create();
	function _create() {
		var oRouter = {
			attachRouteMatched : function() {
			},
			navTo : function() {
			}
		};

		var fGetResourceBundle = function() {
			var oModel = new sap.ui.model.resource.ResourceModel({
				bundleName : "fin.co.costcenter.manage.i18n.i18n",
				bundleLocale : sap.ui.getCore().getConfiguration()
						.getFormatLocale()
			});
			return oModel.getResourceBundle();
		};

		var fGetConnectionManager = function() {
			var oConnectionManager = {
				getModel: function(){
					return {};
				}
			};
			return oConnectionManager;
		};

		var oGetImpl = {
			oConfiguration : {
				oApplicationFacade : {
					getResourceBundle : fGetResourceBundle
				}
			},
			getResourceBundle : fGetResourceBundle,
			getConnectionManager : fGetConnectionManager,
			setModels : function(oController) {
			},
			oMHFHelper : {
				defineMasterHeaderFooter : function() {
				}
			}
		};

		return {
			oRouter : oRouter,
			oGetImpl : oGetImpl
		};
	}
};

fin.co.costcenter.manage_test.mocks.MockInfrastructure.prototype.beginMock = function() {
	this.endMock();
	this.sinons = [];
	/*
	 * The method "getImpl" does not exist at "sap.ca.scfld.md.app.Application"
	 * but it is needed for the scaffolding to work
	 */
	sap.ca.scfld.md.app.Application.getImpl = function() {};
	this.sinons.push(sinon.stub(sap.ca.scfld.md.app.Application, "getImpl").returns(this.oMock.oGetImpl));

	/*
	 * The method "getRouterFor" does not exist at "sap.ui.core.UIComponent" but
	 * it is needed for the scaffolding to work
	 */
	sap.ui.core.UIComponent.getRouterFor = function() {};
	this.sinons.push(sinon.stub(sap.ui.core.UIComponent, "getRouterFor").returns(this.oMock.oRouter));

	/*
	 * To check the navigation, a spy is created for the "navTo" method of the
	 * Router
	 */
	// this.spyRouter = sinon.spy(this.oMockInfrastructure.oRouter, "navTo");
	// this.oView = sap.ui.view({
	// viewName : "fin.co.costcenter.manage.view.T2",
	// type : sap.ui.core.mvc.ViewType.XML,
	// });
	// this.oController = this.oView.getController();
};

fin.co.costcenter.manage_test.mocks.MockInfrastructure.prototype.endMock = function() {
	jQuery.each(this.sinons, function(index, value) {
		value.restore();
	});
};
