sap.ui.define([
	"fin/co/costcenter/manage/formatter/CCMFormatter",
	//"fin/gl/profitcenter/manage/formatter/GCCMFormatter",
	"sap/ca/scfld/md/controller/BaseFullscreenController",
	"sap/ca/ui/quickoverview/EmployeeLaunch",
	"fin/co/costcenter/manage/Utilities",
	"sap/ui/table/TablePersoController",
	"fin/co/costcenter/manage/utils/VariantManage",
	"sap/ui/core/util/Export",
	"sap/ui/core/util/ExportTypeCSV",
	"sap/ui/generic/app/navigation/service/NavigationHandler",
	"sap/ui/generic/app/navigation/service/SelectionVariant"
], function(Formatter) {

	QUnit.module("ViewTest", {
		beforeEach: function() {
			var sRootPath = jQuery.sap.getModulePath("fin.co.costcenter.manage");
			if (sRootPath.indexOf('/', sRootPath.length - 1) === -1) { // ends with '/'
				sRootPath = sRootPath + '/';
			}

			this.aSinons = [];
			//this.oFormatter = new fin.gl.profitcenter.manage.formatter.GCCMFormatter();
			this.oApplication = sap.ca.scfld.md.app.Application;
			this.oApplication.getImpl = function() {};
			this.aSinons.push(sinon.stub(this.oApplication, "getImpl").returns({
				$: function() {
					return {
						closest: function(sClassStyle) {
							return [1, 2, 3];
						}
					};
				},
				getResourceBundle: function() {}
			}));
			jQuery.sap.require({
				modName: "fin.co.costcenter.manage.view.S1",
				type: "controller"
			});

			this.oController = new fin.co.costcenter.manage.view.S1();
			this.oController.oNavigationHandler = {
				storeInnerAppState: function(oState) {
					return {
						done: function() {},
						fail: function() {}
					};
				}
			};
			this.oController.oSmartTable = {
				addStyleClass: function(string) {},
				getCurrentVariantId: function() {}
			};
			this.oController.oSmartFilterBar = {
				getDataSuiteFormat: function() {}
			};
			this.oController.resourceBundle = {
				getText: function(sText) {
					return;
				}
			};
			var oRow = {
				getProperty: function(sKey) {
					if (sKey == 'Datbi' || sKey == 'Datab') {
						var d = new Date();
						return d;
					}
					return sKey;
				}
			};
			this.oController._getSelectedRows = function() {
				return [oRow]
			};
		},
		afterEach: function() {
			jQuery.each(this.aSinons, function(index, value) {
				value.restore();
			});
		}
	});

	QUnit.test("View Tests on onInit method", function() {
		ok(this.oController.onInit, "S1 onInit initialized successed.");
		//this.oController.onInit();
	});
	QUnit.test("View Test on onBeforeRendering method", function() {
		ok(this.oController.onBeforeRendering, "S1 onBeforeRendering initialized successed.");
		this.oController.getOwnerComponent = function() {};
		this.aSinons.push(sinon.stub(this.oController, "getOwnerComponent").returns({
			getCompactCozyClass: function() {
				return "sapUiSizeCompact";
			}

		}));
		this.oController.onBeforeRendering();

	});
	QUnit.test("View Test on initAppState method", function() {
		ok(this.oController.initAppState, "S1 initAppState initialized successed.");
		this.oController.initAppState();
	});
	QUnit.test("View Test on onInitSmartFilterBar method", function() {
		ok(this.oController.onInitSmartFilterBar, "S1 onInitSmartFilterBar initialized successed.");
		this.oController.onInitSmartFilterBar();
	});
	QUnit.test("View Test on onBeforeRebindTable method", function() {
		ok(this.oController.onBeforeRebindTable, "S1 onBeforeRebindTable initialized successed.");
		var oEvent = {
			bCancelBubble: false,
			bPreventDefault: false,
			mParameters: {
				bindingParams: {
					parameters: {
						select: "Prctr,Ktext,Datab,Khinr,VerakUserText,Segment"
					}
				}
			},
			getParameter: function(sKey) {
				return this.mParameters.bindingParams;
			}
		};
		this.oController.onBeforeRebindTable(oEvent);
	});
	QUnit.test("View Test on _unique method", function() {
		ok(this.oController._unique, "S1 _unique initialized successed.");
		var array = [1, 2, 3];
		var r = this.oController._unique(array);
		//	equal(array,r, "not equal");
	});
	QUnit.test("View Test on _getShareID method", function() {
		ok(this.oController._getShareID, "S1 _getShareID initialized successed.");
		this.oController._getShareID();
	});
	QUnit.test("View Test on _getShareDisplay method", function() {
		ok(this.oController._getShareDisplay, "S1 _getShareDisplay initialized successed.");
		this.oController._getShareDisplay();
	});
	QUnit.test("View Test on _getSelectedRows method", function() {
		ok(this.oController._getSelectedRows, "S1 _getSelectedRows initialized successed.");
		//	this.oController._getSelectedRows();
	});
	QUnit.test("View Test on _convertDateObj2DATUM method", function() {
		ok(this.oController._convertDateObj2DATUM, "S1 _convertDateObj2DATUM initialized successed.");
		var d = new Date();
		this.oController._convertDateObj2DATUM(d);
	});
	QUnit.test("View Test on onSearch method", function() {
		ok(this.oController.onSearch, "S1 onSearch initialized successed.");
		this.oController.onSearch();
	});
	QUnit.test("View Test on onAfterApplyTableVariant method", function() {
		ok(this.oController.onAfterApplyTableVariant, "S1 onAfterApplyTableVariant initialized successed.");
		this.oController.onAfterApplyTableVariant();
	});
	QUnit.test("View Test on onRowSelect method", function() {
		ok(this.oController.onRowSelect, "S1 onRowSelect initialized successed.");
		this.oController.setHeaderFooterOptions = function(oOption){};                         
		this.oController.onRowSelect();
	});
	QUnit.test("View Test on onCellClick method", function() {
		ok(this.oController.onCellClick, "S1 onCellClick initialized successed.");
		this.oController.getView = function(oOption) {
			return {
				byId: function(Id) {
					return {
						setSelectedIndex: function(i) {}
					}
				}
			}
		};
		var oEvent = {
			getParameters: function() {
				return {
					rowBindingContext: "test",
					rowIndex: "0"
				}
			}
		}
		this.oController.setHeaderFooterOptions = function(oOption) {};
		this.oController.onCellClick(oEvent);
	});
	QUnit.test("View Test on pNaviToFactsheet method", function() {
		ok(this.oController.pNaviToFactsheet, "S1 pNaviToFactsheet initialized successed.");
		var evt = {
			getSource: function() {
				return {
					getBindingContext: function() {
						return {
							getProperty: function() {
								return {
									Prctr: "",
									Kokrs: "",
									Datbi: "",
									Datab: ""
								}
							}
						}
					}
				}
			}
		}
		this.oController._convertDateObj2DATUM = function() {};
		this.oController._navigate2PCFPM = function() {};
		this.oController.pNaviToFactsheet(evt);
	});
});