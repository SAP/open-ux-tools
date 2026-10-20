sap.ui.define([
		"sap/ui/core/UIComponent",
		"jquery.sap.global",
		"sap/m/MessageBox",
		"fin/co/costcenter/manage/Utilities"
//	    "fin/co/costcenter/manage/Component"
//	    "sap.ca.scfld.md.app.Application"
//	    "sap.ca.scfld.md.ComponentBase"
   ], function (UIComponent, jQuery, MessageBox, Utilities) {
	
   	QUnit.module("UtilitiesTest", {
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
   	
   	
   	
   	QUnit.test("Utilities test", function() {
   		//var oComponent = fin.co.activitytype.manage.Component();
   		notEqual(Utilities, undefined, "Utilities initialized successed.");
   	});
   	
});