jQuery.sap.declare("fin.co.costcenter.manage.formatter.CCMFormatter");
jQuery.sap.require("sap.ui.core.Element");
jQuery.sap.require("sap.ui.model.type.Date");
jQuery.sap.require("sap.ui.core.format.DateFormat");
jQuery.sap.require("sap.ui.core.format.NumberFormat");
jQuery.sap.require("fin.co.costcenter.manage.utils.Mapping");

sap.ui.core.Element.extend("fin.co.costcenter.manage.formatter.CCMFormatter", {
    metadata: {
        publicMethods: [
           "test",
           "itemcount",
           "Date",
           "formatDate",
           "nameWithDescrip"
        ]
    },

    init: function() {
    	
    	var that = this;
    	// initialize formatter, get necessary resources
    	this.bundle = sap.ca.scfld.md.app.Application.getImpl().getResourceBundle(); 

    },
       
	formatDate: function(date) {
		if(date === null || date === undefined){
			return "";
		}else{
			var formatter = sap.ui.core.format.DateFormat.getDateInstance({style:"short"});
			return formatter.format(date, true);
		}		
	},
	nameWithDescrip : function(id, name){
		if (!name||!id) {return id;}
		else{
		return name + " (" + id + ")";};
	},
});