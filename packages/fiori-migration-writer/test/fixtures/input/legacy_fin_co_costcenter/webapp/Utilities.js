jQuery.sap.declare("fin.co.costcenter.manage.Utilities");
jQuery.sap.require("sap.m.MessageBox");

fin.co.costcenter.manage.Utilities = {
		
		 postDataWithoutContext : function (oModel,sPath, oData, oParameters,model){

				var successCallback = jQuery.proxy(function(oData){
				var m = new sap.ui.model.json.JSONModel(); 
				m.setData(oData);
				this.getView().setModel(m,model);
				},this);
				oModel.read(sPath, null, oParameters, false, successCallback, 
				jQuery.proxy(this.onRequestFailed, this)
				);
				// oModel.updateBindings();			
				},
				
				
			/**
			 * Displays an F4 drop-down dialog
			 * 
			 * @param oController  {Controller} the controller calling the method for example this.
			 * @param sDialogTitle {String} .
			 * @param sSearchField {String}  the field in model need to filter .
			 * @param oFiledinEdit {Object}  the field in edit.
			 * @param sModle       {String}  the JSON modeL name. 
			 * @param sPath        {String}  the path of list item.
			 * @param sTitle       {String}  the first line show in the item.
			 * @param sDescription {String}  Optional.the second line show in the item.
			 * @param sIcon        {String}  Optional. the icon show in the left of item.
			 * @return pup up a dialog.
			 */

			F4DialogOpen : function (oController, sDialogTitle,nodatatext, sSearchField, oFiledinEdit,oFiledinEditText, sModle, sPath, sTitle, sDescription,sIcon){
			   
			    //var bundle = oController.getView().getModel("i18n").getResourceBundle();
			    var getBoolean = function(){
			    	if(sIcon){return false;}
			    	else{return true;}
			    	};
			    var bIcon = getBoolean();
			    var that = oController;
			    var _handleValueHelpSearch = function (evt) {
			        var sValue = evt.getParameter("value");
			        var aFilters = [];
			            aFilters.push(new sap.ui.model.Filter(sSearchField,sap.ui.model.FilterOperator.Contains, sValue)) ;             
			           // aFilters.push(new sap.ui.model.Filter(sSearchField2,sap.ui.model.FilterOperator.Contains, sValue)) ;                  
			        evt.getSource().getBinding("items").filter(aFilters,false);
			    };

			    var _handleValueHelpClose = function (evt) {
			        var oSelectedItem = evt.getParameter("selectedItem");
			        if (oSelectedItem) {
			           // var r = oSelectedItem.getTitle();
			           oFiledinEdit.setValue(oSelectedItem.getTitle());
			           oFiledinEditText.setText(oSelectedItem.getDescription());
			        }
			        evt.getSource().getBinding("items").filter();
			    };

			    if (!oController._valueHelpDialog) {
			    	 oController._valueHelpDialog = new sap.m.SelectDialog({
			            title: sDialogTitle,
			            noDataText : nodatatext,
			            items: {
			                path: sPath,
			                template: new sap.m.StandardListItem({
			                    title: sTitle,
			                    description: sDescription,      
			                    Icon:sIcon,
			                    iconDensityAware: bIcon,
			                    iconInset: bIcon,
			                    active: true
			                })
			            },
			            liveChange: _handleValueHelpSearch,
			            search: _handleValueHelpSearch,
			            confirm: _handleValueHelpClose,
			            cancel: _handleValueHelpClose
			        });
			    	oController._valueHelpDialog.setModel(that.getView().getModel(sModle), sModle);
			    }
			    // open value help dialog			
			    oController._valueHelpDialog.setModel(that.getView().getModel(sModle), sModle);
//			    if(sIcon){
//			    	oController._valueHelpDialog.setIconInset(true); 
//			    	oController._valueHelpDialog.setIcon(sIcon);
//			    };
			        oController._valueHelpDialog.open();
			}

		
};
