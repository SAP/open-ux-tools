jQuery.sap.declare("fin.co.costcenter.manage.utils.Mapping");



fin.co.costcenter.manage.utils.Mapping = {
		
		status : {
				"A" : "",  // need i18n
				"I" : "Inactive",   //create
				"U" : "Inactive",   //change
				"D" : "Deleted"    //delete
		},
		
		statusColor : {
//			"A" : sap.ui.commons.TextViewColor.Positive,
//			"I" : sap.ui.commons.TextViewColor.Negative,
//			"U" : sap.ui.commons.TextViewColor.Negative,
//			"D" : sap.ui.commons.TextViewColor.Negative
			"A" : sap.ui.core.ValueState.Success,
			"I" : sap.ui.core.ValueState.Error,
			"U" : sap.ui.core.ValueState.Error,
			"D" : sap.ui.core.ValueState.Warning
		},
		
		defaultColumn : {
		    "COL_KOSTL" : null,
		    "COL_VALID_FROM" : null,
		    "COL_Std_Hierarchy" : null,
		    "COL_User_Responsible" : null,
		    "COL_COMPANY_CODE" : null,
		    "COL_PRCTR" : null,
		    "COL_KOSAR" : null
		    //Append default columns here
		}
		
};