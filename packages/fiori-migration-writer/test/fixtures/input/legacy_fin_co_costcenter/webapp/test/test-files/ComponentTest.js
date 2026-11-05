sap.ui.define([
		"sap/ui/core/UIComponent",
		"jquery.sap.global",
		"fin/co/costcenter/manage/formatter/CCMFormatter",
		"fin/co/costcenter/manage/Component"
//	    "fin/co/costcenter/manage/Component"
//	    "sap.ca.scfld.md.app.Application"
//	    "sap.ca.scfld.md.ComponentBase"
   ], function (UIComponent, jQuery, formatter, Component) {
	
   	QUnit.module("ComponentTest", {
   		beforeEach: function() {
   			var sRootPath = jQuery.sap.getModulePath("fin.co.costcenter.manage");
   			if (sRootPath.indexOf('/', sRootPath.length - 1) === -1) { // ends with '/'
   				sRootPath = sRootPath + '/';
   			}  
   			//jQuery.sap.require("fin.co.activitytype.manage.Component");
   			this.aSinons = [];
   		},
   		afterEach: function() {
   			jQuery.each(this.aSinons, function(index, value) {
   	            value.restore();
   	        });
   		}
   	});
   	
   	
   	
   	QUnit.test("Component test", function() {
   		//var oComponent = fin.co.activitytype.manage.Component();
   		notEqual(Component, undefined, "Component initialized successed.");
   	});
   	
  /* 	QUnit.test("getCompactCozyClass method Test",function(){
			var fn = Component.prototype.getCompactCozyClass;
			var result = fn();
			//this.oController.statusMapping();
			equal(result,"sapUiSizeCozy","getCompactCozyClass Success");
			// result = fn("sapUiSizeCompact");
			// equal(result,"sapUiSizeCozy","getCompactCozyClass Success");
		});*/
		
    QUnit.test("createContent method Test",function(){
			//var fn = Component.prototype.createContent;
			ok(fn = Component.prototype.createContent,"initial");
		});
   	
});