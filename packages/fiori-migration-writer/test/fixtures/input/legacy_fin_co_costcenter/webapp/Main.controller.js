sap.ui.controller("fin.co.costcenter.manage.Main", {

	onInit : function() {
		jQuery.sap.require("sap.ca.scfld.md.Startup");				
		sap.ca.scfld.md.Startup.init('fin.co.costcenter.manage', this);
	}
});
