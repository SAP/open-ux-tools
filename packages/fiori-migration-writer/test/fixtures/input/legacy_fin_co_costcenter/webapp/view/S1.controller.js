jQuery.sap.require("fin.co.costcenter.manage.formatter.GCCMFormatter");
jQuery.sap.require("fin.co.costcenter.manage.formatter.CCMFormatter");
jQuery.sap.require("sap.ca.scfld.md.controller.BaseFullscreenController");
jQuery.sap.require("sap.ca.ui.quickoverview.EmployeeLaunch");
jQuery.sap.require("sap.ui.table.TablePersoController");
jQuery.sap.require("fin.co.costcenter.manage.Utilities");
jQuery.sap.require("fin.co.costcenter.manage.utils.VariantManage");
jQuery.sap.require("sap.ui.core.util.Export");
jQuery.sap.require("sap.ui.core.util.ExportTypeCSV");
//jQuery.sap.require("sap.fin.central.lib.nav.SelectionVariant");
//jQuery.sap.require("sap.fin.central.lib.nav.NavigationHandler");
jQuery.sap.require("sap.ui.generic.app.navigation.service.NavigationHandler");
jQuery.sap.require("sap.ui.generic.app.navigation.service.SelectionVariant");

sap.ca.scfld.md.controller.BaseFullscreenController.extend("fin.co.costcenter.manage.view.S1", {
    onInit : function() {
        var that = this;
        this.oSmartTable = this.byId("fin.co.costcenter.manage.s1.smarttable");  
        this.oSmartFilterBar = this.byId("fin.co.costcenter.manage.smartfilterbar");
        //this.oNavigationHandler = new  sap.fin.central.lib.nav.NavigationHandler(this);
        this.oNavigationHandler = new sap.ui.generic.app.navigation.service.NavigationHandler(this);
        this.oRouter.attachRouteMatched(
                function (evt) {
                    if (evt.getParameter("name") === "appctx") {
                    	var context = evt.getParameter("arguments").filter;
                    	var filterItems = $.parseJSON(decodeURI(context));
                    	var filterData = decodeURI(evt.getParameter("arguments").filterData);
                    	if (filterData !== "undefined") {                      		
                    		that.byId("fin.co.costcenter.manage.smartfilterbar").setFilterDataAsString(filterData);
                    		   
                    	} 
                		that._table.bindRows({
                			path : '/CostCenterSet',
                			parameters: { useBatchRequests: true , provideGrandTotals: true , provideTotalResultSize: true },
                			filters : filterItems
                		}); 
                		that._table.setShowOverlay(false); 
                    }
                }
            );
        
      
        	
        this._table = this.byId("fin.co.costcenter.manage.table");  
        
		var onSFBFilterChange=function(){
			//Set the overlay for table
            that._table.setShowOverlay(true);    		
		}; //onSFBFilterChange
		
		that.byId("fin.co.costcenter.manage.smartfilterbar").attachFilterChange(onSFBFilterChange);
		
        this.resourceBundle = this.oApplicationFacade.getResourceBundle();
               
       // apart from not using the compact design: did you start the app on an iPad - if not then you have probably not applied the compact design. You need to add in the init method of your controller
        // if (sap.ui.Device.system.desktop) {  
        //     this.getView().addStyleClass("sapUiSizeCompact");
        //     this._table.addStyleClass("sapUiSizeCondensed");
        // };  
        this.getView().addStyleClass(this.getOwnerComponent().getCompactCozyClass());
        
        // initialize noDataText
        var noData = this.resourceBundle.getText("NO_DATA_A");
        if (this._table.setNoDataText) {
        	this._table.setNoDataText(noData);
	     } else {
	    	this._table.setNoData(noData);
	     } 

        
        // hide unnecessary columns
//        this._table.getColumns().forEach(function (c){
//        	var id = c.getId().split("fin.co.costcenter.manage.")[1];//get the column id, a little verbose 
//        	if (!fin.co.costcenter.manage.utils.Mapping.defaultColumn.hasOwnProperty(id)) c.setVisible( false );
//        });
         
        try {
        	// Variant Management of the table layout
        	fin.co.costcenter.manage.utils.VariantManage(this);
        	// variant on filterbar                 	
        } catch (e) {/* non-shell mode */ }
        
//        this.onDataExport();
        
        
        this.bOnInitFinished = true;
        this.initAppState();
    },
    
    onBeforeRendering: function(){
	  	var sCozyClass = "sapUiSizeCozy", sCompactClass = "sapUiSizeCompact", sCondensedClass = "sapUiSizeCondensed";
	  	if(jQuery(document.body).hasClass(sCompactClass) || this.getOwnerComponent().getCompactCozyClass() === sCompactClass){
			this.oSmartTable.addStyleClass(sCondensedClass);
		} else if(jQuery(document.body).hasClass(sCozyClass) || this.getOwnerComponent().getCompactCozyClass() === sCozyClass){
			this.oSmartTable.addStyleClass(sCozyClass);
		}
	  },
    
    initAppState : function() {
    	
    	// check if both init events for the controller and the SmartFilterBar have finished
        if (!(this.bFilterBarInitialized && this.bOnInitFinished)) {
            return;
        }
        var that = this;
        var oOptions = {
        		aAdditionalSettingButtons: [{
        			//TODO: add our setting		
        			sI18nBtnTxt: this.resourceBundle.getText("SETTINGS"),
                    sIcon: "sap-icon://settings",
                    onBtnPressed: function(oEvent){
                    	that.onSetControllingAreaDialog();
                    	}
        		     }],
        		     buttonList : [
       			      			{
       			      			    sI18nBtnTxt : "BTN_ADD",
       			      			    onBtnPressed : function(evt) {
       			      			    	that.onNavi("NEW");
       			      			    }
       			      			}]
        };
        
        /**    
         * @ControllerHook Add button into header options     
         * This method will be called in the initial load, and user has the chance to      
         * add more buttons into the options  
         * @callback fin.co.costcenter.manage.view.S1~extHookGetSettingsButton    
         * @param {object} oOptions
        * @return {void}
        */
        
        if (this.extHookGetSettingsButton) {
               this.extHookGetSettingsButton(oOptions);
        }
        
        this.setHeaderFooterOptions(oOptions);

        var oParseNavigationPromise = this.oNavigationHandler.parseNavigation();

        var that = this;
        oParseNavigationPromise.done(function(oAppData, oURLParameters, sNavType) {  
        	if(oURLParameters.Kokrs) {
 				that.controllingArea = oURLParameters.Kokrs[0];
 			}
        	else if(oAppData.customData){
        		if ('ControllingArea' in oAppData.customData){
            		that.controllingArea = oAppData.customData.ControllingArea;
        		}
        	}
         	else {
         		if (!this._bControllingareaExistMessageOpen) {
	  				that._bControllingareaExistMessageOpen = true;
	  				sap.m.MessageBox.show(
	  					that.resourceBundle.getText("MSG_CONTROLLINGAREA_NOTSELECT"),
	  					{
	  						id : "controllingareaExistMessageBox1",
	  						icon: sap.m.MessageBox.Icon.WARNING,
	  						title: that.resourceBundle.getText("TXT_WARNING_ERROR"),
	  						details: that.resourceBundle.getText("MSG_CONTROLLINGAREA_NOTSELECT_DETAIL"),
	  						actions: [sap.m.MessageBox.Action.OK],
	  						onClose: function (sAction) {
	  							that._bControllingareaExistMessageOpen = false;
	  						}.bind(that)
	  					}
	  				);
	  			}
         	}    	
            
            if (sNavType !== sap.ui.generic.app.navigation.service.NavType.initial) {
            	
               var bHasOnlyDefaults = oAppData && oAppData.bNavSelVarHasDefaultsOnly;
			   var oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(oAppData.selectionVariant); 
			   var aSelectionVariantProperties = oSelectionVariant.getParameterNames().concat(oSelectionVariant.getSelectOptionsPropertyNames());
			   //var mUIStateProperties = {replace: true, strictMode: false};
			   //var oUiState = new sap.ui.comp.state.UIState({ selectionVariant: JSON.parse(oAppData.selectionVariant) });
			   for (var i = 0; i < aSelectionVariantProperties.length; i++){
			   	that.oSmartFilterBar.addFieldToAdvancedArea(aSelectionVariantProperties[i]);
			   }
			   if(!bHasOnlyDefaults || that.oSmartFilterBar.getCurrentVariantId() === ""){
			   	that.oSmartFilterBar.clearVariantSelection();
			   	that.oSmartFilterBar.clear();
			  // 	that.oSmartFilterBar.setUiState(oUiState, mUIStateProperties);
			  that.oSmartFilterBar.setDataSuiteFormat(oAppData.selectionVariant);
			   }
			   if(oAppData.tableVariantId){
			   	that.oSmartTable.setCurrentVariantId(oAppData.tableVariantId);
			   }
			   that.restoreCustomAppStateData(oAppData.customData);
			   if(!bHasOnlyDefaults){
			   	that.oSmartFilterBar.search();
			   }
               // if the app is started with any parameters, then clear the filter bar variant
            	// var filterBarVariantId = that.oSmartFilterBar.getCurrentVariantId();
            	// that.oSmartFilterBar.clearVariantSelection();
             //   that.oSmartFilterBar.setDataSuiteFormat(oAppData.selectionVariant);
             //   //that.oSmartFilterBar.setCurrentVariantId(filterBarVariantId);
             //   that.oSmartTable.setCurrentVariantId(oAppData.tableVariantId);
             //   if(oAppData.customData === undefined) {
             //   	oAppData.customData = that.getCustomAppStateData();
             //   }
             //   that.restoreCustomAppStateData(oAppData.customData);
             //   that.oSmartTable.rebindTable();
            }

        });

        oParseNavigationPromise.fail(function(oError) {
            //error handling
        });
    },
    
    onBeforeRebindTable : function(oEvent){
    	//run before table rebind
    	var oBindingParams = oEvent.getParameter("bindingParams");
    	var selectTemp = oBindingParams.parameters.select;
    	var selects = selectTemp.split(",");
    	//the following fields will be used for navigation
    	selects.push("Kokrs");
    	selects.push("Kostl");
    	selects.push("Datbi");
    	selects.push("Datab");
    	selects.push("Ktext");
    	selects.push("Prctr");
    	selects = this._unique(selects);
    	selectTemp = "";
    	for (var i in selects){
    		selectTemp = selectTemp + selects[i] + ",";
    	}
    	selectTemp = selectTemp.substring(0, selectTemp.length-1);
    	oBindingParams.parameters.select = selectTemp;
    },
    
    onInitSmartFilterBar: function(oEvent) {
        this.bFilterBarInitialized = true;
        this.initAppState();
    },
    
    _unique : function(array){
	  var r = [];
	  for(var i = 0; i < array.length; i++) {
	    for(var j = i + 1; j < array.length; j++)
	      if (array[i] === array[j]) j = ++i;
	    r.push(array[i]);
	  }
	  return r;
    },

    /**
     * @description Get ID for Jam sharing
     */
    _getShareID : function(){
    	
    	var url = document.URL;
    	var para, url_id;
    	var row = this._getSelectedRows();
    	
    	if ( row.length != 1 ) {
			sap.m.MessageBox.error(this.resourceBundle.getText("MSG_SELECT_SINGLE_ITEM"));  					
			return;
		}
    	
    	var Kostl = this.formatKostl(row[0].getProperty('Kostl'));
    	
    	para = "#CostCenter-openCostCenter" + "?FPM_START_PAGE_ID=FCOM_OVP_INIT&IV_SEARCH_X=&IV_KOSTL=" + Kostl + 
    			"&IV_KOKRS=" + row[0].getProperty('Kokrs') + "&IV_DATBI=" + this._convertDateObj2DATUM(row[0].getProperty('Datbi')) + 
    			"&IV_DATAB=" + this._convertDateObj2DATUM(row[0].getProperty('Datab'));
    	url_id = url.replace("#CostCenter-manageCostCenter",para);
    	
    	return url_id;
    },
    
    /**
     * @description Get share display content
     */
    _getShareDisplay : function(){
    	var row = this._getSelectedRows();
    	
    	var desc = row[0].getProperty('Kostl') + "-" + row[0].getProperty('Ktext');
//		var volume= row[0].getProperty('Ktext');
//		var currencyCode = row[0].getProperty('Datab') + "-" + row[0].getProperty('Datbi');
		
//		var currencyCode = "Valid From:" + this._convertDateObj2DATUM(row[0].getProperty('Datab'));
//		var predictresult = this.byId('PredictResult').getText();
//		var orderstatus = this.byId('OrderStatus').getText();
		var object = new sap.m.ObjectListItem({
			title:desc
//			number:volume,
//			numberUnit:currencyCode,
//			attributes : [new sap.m.ObjectAttribute({
//				text : predictresult
//			})],
//			firstStatus : new sap.m.ObjectStatus ({text : orderstatus }),
		});
		return object; 
    	
    },
    
    
    /**
     * @description Get selected rows
     * @returns Array of Row Objects
     */
    _getSelectedRows : function() {
    	var table = this.byId("fin.co.costcenter.manage.table");
    	var rows = [];
    	table.getSelectedIndices().forEach( function(i) {
    		rows.push(table.getContextByIndex(i));
    	}
    	);
    	
    	return rows;
    },
    
    
    /**
     * @description Before launch FPM, setup necessary parameters based on navigation mode
     * @param mode {string}Navigation mode: new, edit, copy, display
     */
    onNavi : function(mode) {
    	mode = mode.toUpperCase();
    	
    	var row = this._getSelectedRows(),
    		para;
    	   
    	if ( mode != 'NEW' ) {
    		// single selection is a must
    		if ( row.length != 1 ) {
    			sap.m.MessageBox.error(this.resourceBundle.getText("MSG_SELECT_SINGLE_ITEM")); 					
    			return;
    		}
    		
    		var Kostl = this.formatKostl(row[0].getProperty('Kostl'));
    			
    		if (mode == 'DISPLAY' || mode == 'EDIT') {
    			para = {
    					IV_KOKRS : row[0].getProperty('Kokrs'),
    					IV_KOSTL : Kostl,//row[0].getProperty('Kostl'),
    					IV_DATBI : this._convertDateObj2DATUM(row[0].getProperty('Datbi')),
    					IV_DATAB : this._convertDateObj2DATUM(row[0].getProperty('Datab'))
    			};
    			
    		} else { // Copy Mode   			
    			para = {
    					IV_COPY_KOSTL : Kostl,//row[0].getProperty('Kostl'),
    					IV_COPY_KOKRS : row[0].getProperty('Kokrs'),
    					IV_COPY_DATBI : this._convertDateObj2DATUM(row[0].getProperty('Datbi')),
    					IV_COPY_DATAB : this._convertDateObj2DATUM(row[0].getProperty('Datab'))
    			};
    			mode = 'NEW'; //backend needs this.
    		}
    	}
    	
    	this._navigate2FPM(mode, para);  		
    },
    
    /**
     * @description General Navigation handler
     * @param mode {string}display or edit
     * @param parameters {hashmap}additional parameters
     */
    _navigate2FPM : function(mode, parameters){
    	mode = mode.toUpperCase();
    	var para = { 
			 FPM_START_PAGE_ID : "FCOM_OVP_INIT",
			 IV_EDIT_MODE : mode,
			 IV_SEARCH_X : ""
    	};
    	// append other parameters
    	for (var p in parameters) {
    		para[p.toUpperCase()] = parameters[p];
    	}
    	// call service, to finish the whole deal
        var fgetService =  sap.ushell && sap.ushell.Container && sap.ushell.Container.getService;
        this.oCrossAppNavigator = fgetService && fgetService("CrossApplicationNavigation");
        if (this.oCrossAppNavigator)
        {
	      	this.oCrossAppNavigator.toExternal({
	                target: { semanticObject : "CostCenter", action: "openCostCenter" },
	                params : para
	        	});
      	};
    },
    
    
    /**
     * @description General Navigation handler
     * @param mode {string}display or edit
     * @param parameters {hashmap}additional parameters
     */
    _navigate2PCFPM : function(mode, parameters){
    	mode = mode.toUpperCase();
    	var para = { 
			 FPM_START_PAGE_ID : "FPM_CREATE_PAGE",
			 EDIT_MODE : mode
    	};
    	// append other parameters
    	for (var p in parameters) {
    		para[p.toUpperCase()] = parameters[p];
    	}
    	// call service, to finish the whole deal
        var fgetService =  sap.ushell && sap.ushell.Container && sap.ushell.Container.getService;
        this.oCrossAppNavigator = fgetService && fgetService("CrossApplicationNavigation");
        if (this.oCrossAppNavigator)
        {
	      	this.oCrossAppNavigator.toExternal({
	                target: { semanticObject : "ProfitCenter", action: "openProfitCenter" },
	                params : para
	        	});
      	};
    },
    
    checkEdit : function (){
    	
    	var row = this._getSelectedRows();
    	if ( row.length != 1 ) {
			sap.m.MessageBox.error(this.resourceBundle.getText("MSG_SELECT_SINGLE_ITEM"));  					
			return;
		}
    	var para = [],
    		bundle = this.resourceBundle;
    	
    	var busyDialog = new sap.m.BusyDialog({
    		showCancelButton : false
    	}).open();

    	var succ = function(){
    		busyDialog.close();
    		this.onNavi("EDIT");
    	};
    	
    	var fail = function(response) {
    		sap.m.MessageBox.alert(JSON.parse(response.response.body).error.message.value, {
    			icon : sap.m.MessageBox.Icon.ERROR,
    			title : bundle.getText("MSG_NO_AUTH_EDIT")
    		});
    		busyDialog.close();
    	};
    	para.push("Kostl='" + encodeURI(row[0].getProperty("Kostl")) + "'");
    	para.push("Kokrs='" + row[0].getProperty("Kokrs") + "'");
    	
    	var oModel = this.getView().getModel();
    	oModel.read("EditCostCenterCheck", null, para, true,jQuery.proxy(succ,this),fail);
    },
    
    checkCreate : function (mode){
    	var row = this._getSelectedRows();
    	if ( row.length != 1 && mode == "COPY" ) {
			sap.m.MessageBox.error(this.resourceBundle.getText("MSG_SELECT_SINGLE_ITEM")); 					
			return;
		}
        var para = [],
        	bundle = this.resourceBundle;
    	var busyDialog = new sap.m.BusyDialog({
    		showCancelButton : false
    	}).open();

    	var succ = function(){
    		busyDialog.close();
    		this.onNavi(mode);
    	};
    	
    	var fail = function(response) {
    		sap.m.MessageBox.error(this.resourceBundle.getText("MSG_SELECT_SINGLE_ITEM"));
    		busyDialog.close();
    	};
    	para.push("Kostl='DUMMY'");
    	para.push("Kokrs='0001'");
    	
    	var oModel = this.getView().getModel();
    	oModel.read("CreateCostCenterCheck", null, para, true,jQuery.proxy(succ,this),fail);
    },
    
    /**
     * @description Handle factsheet navigation for Cost Center
     */
    pNaviToFactsheet : function (evt){ 
 	   var selectedDetail = evt.getSource().getBindingContext().getProperty();
 	   if (!selectedDetail) {
 		   //alert("no selected item");
		   return;
 	   }
 	   
 		var Kostl = this.formatKostl(selectedDetail.Kostl);
    	
		var para = {
				IV_KOKRS : selectedDetail.Kokrs,
				IV_KOSTL : Kostl,//row[0].getProperty('Kostl'),
				IV_DATBI : this._convertDateObj2DATUM(selectedDetail.Datbi),
				IV_DATAB : this._convertDateObj2DATUM(selectedDetail.Datab)
		};
		
		this._navigate2FPM('DISPLAY', para);
    	
    },
    
    /**
     * @description Handle factsheet navigation for Profit Center
     */
    pNaviToPCFactsheet : function (evt){ 
 	   var selectedDetail = evt.getSource().getBindingContext().getProperty();
 	   if (!selectedDetail) {
 		   //alert("no selected item");
		   return;
 	   }
 	   
 	  var para = {
 	   	ProfitCenter : selectedDetail.Prctr,
		ControllingArea : selectedDetail.Kokrs,
		ValidToDate : this._convertDateObj2DATUM(selectedDetail.Datbi),
		ValidFromDate : this._convertDateObj2DATUM(selectedDetail.Datab)
 	  };
 	  
 	 this._navigate2PCFPM('DISPLAY', para);
 	  
    },
    
    /**
     * @description Handle factsheet navigation for Cost Center Group
     */
/*    pNaviToGrpFactsheet : function (evt){ 
 	   var selectedDetail = evt.getSource().getBindingContext().getProperty();
 	   if (!selectedDetail) {
 		   //alert("no selected item");
		   return;
 	   }
 	   
 	   // External Navigation
 	   var fgetService =  sap.ushell && sap.ushell.Container && sap.ushell.Container.getService;
	          this.oCrossAppNavigator = fgetService && fgetService("CrossApplicationNavigation");
	          if(this.oCrossAppNavigator)
	          {
		          this.oCrossAppNavigator.toExternal({
		              target: { semanticObject : "CostCenterGroup", action: "displayFactSheet" },
		              params : { ControllingArea : selectedDetail.Kokrs, CostCenterGroup : selectedDetail.Khinr, SetClass : "0101" }
		          });
	          }
    },*/
    
      
    /** 
     *  @description Event handler when Search button was hit
     *  @param oEvent
     */
    onSearch : function(oEvt){
    	this.storeCurrentAppState();
    },
    
    onAfterApplyTableVariant: function(oEvent) {
		// write inner app state
		this.storeCurrentAppState();
	},
    
	/** 
	     *  @description  postData With back end.
	     *  @param oEvent
	     */
	  postDataWithoutContext : function (sPath, oData, oParameters,model){
	    	var oModel = this.oConnectionManager.getModel();
	    	var successCallback = jQuery.proxy(function(oData, oResponse){
	    	var m = new sap.ui.model.json.JSONModel(); 
	    	m.setData(oData);
	    	this.getView().setModel(m,model);
	    	},this);
	    	oModel.read(sPath, null, oParameters, false, successCallback, 
	    	jQuery.proxy(this.onRequestFailed, this)
	    	);
	    	// oModel.updateBindings();			
	    	},
	
	  getSetControllingArea:function (vControllingAreaInputValue,stype){
	    		var aUrlParams = ["ControllingArea=" +"'"+  vControllingAreaInputValue + "'"  + "&" + "Type=" +"'"+ stype +"'" ];		    
	    		this.postDataWithoutContext("GetSetControllingArea",null,aUrlParams,"mControllingArea");
	    	}, 
    	
	 /** 
	     *  @description Event handler when set Controlling Area was hit
	     *  @param oEvent
	     */
	 onSetControllingAreaDialog: function() {   	 	
			 if (!this.SetControllingAreaDialog) {
			        this.SetControllingAreaDialog = sap.ui.xmlfragment("SetControllingAreaDialog","fin.co.costcenter.manage.view.SetControllingAreaDialog", this);
			};	
		this.getView().addDependent(this.SetControllingAreaDialog);	
	
	 //get controlling area from back end   
	   this.getSetControllingArea("","GET");
	   var vControllingArea = this.getView().getModel("mControllingArea").oData.results[0].ControllingArea;
	   var vControllingAreaName = this.getView().getModel("mControllingArea").oData.results[0].ControllingAreaName;
	   		
		//controlling area		
		sap.ui.getCore().byId("SetControllingAreaDialog--input.ControllingArea").setValue(vControllingArea); 
		sap.ui.getCore().byId("SetControllingAreaDialog--input.ControllingAreaName").setText(vControllingAreaName); 
		this.SetControllingAreaDialog.open();		
	},
	
	
	
	/** 
	 *  @description Event handler when  Controlling Area f4 was hit,will open f4 dialog.
	 *  @param oEvent
	 */
	onF4ControllingArea : function() {		    
	    this.postDataWithoutContext("ControllingAreaList",null,null,"mControllingAreaList");		
		var sdialogTitle = this.resourceBundle.getText("F4_CONTROLLING_AREA_TITLE");
		var sNODATA = this.resourceBundle.getText("NO_DATA");
		fin.co.costcenter.manage.Utilities.F4DialogOpen(this,sdialogTitle,sNODATA,"IDANDNAME",sap.ui.getCore().byId("SetControllingAreaDialog--input.ControllingArea"),sap.ui.getCore().byId("SetControllingAreaDialog--input.ControllingAreaName"),"mControllingAreaList",'mControllingAreaList>/results',"{mControllingAreaList>ControllingArea}","{mControllingAreaList>ControllingAreaName}");
		
	}, 

	/** 
	 *  @description Event handler when  Controlling Area input field enter was hit.
	 *  @param oEvent
	 */
	onChangeinput:function(){
	    //Get value from input filed
		var oControllingAreaInput =  sap.ui.getCore().byId("SetControllingAreaDialog--input.ControllingArea");
		var oControllingAreaInputText =  sap.ui.getCore().byId("SetControllingAreaDialog--input.ControllingAreaName");		
		
		var oControllingAreaInputValue = oControllingAreaInput.getValue().toUpperCase();
		    oControllingAreaInput.getValue(oControllingAreaInputValue);
		
		if (oControllingAreaInputValue.length > 0){
			//set value to back end
		    this.getSetControllingArea(oControllingAreaInputValue,"GET");
			var iresult = this.getView().getModel("mControllingArea").oData.results[0];
			//if set error
		    if (iresult.IS_ERROR == 'X'){
				if  (iresult.MESSAGETYPE == "E"){
					sap.m.MessageBox.error(iresult.MESSAGE);
						}
				else if (iresult.MESSAGETYPE == "W"){
					sap.m.MessageBox.warning(iresult.MESSAGE);
					    }	
		    }else {	
		    	oControllingAreaInputText.setText(iresult.ControllingAreaName);
			}	
		}
	},

	/** 
	 *  @description Event handler when  Controlling Area  OK button was hit.
	 *  @param oEvent
	 */
	onControllingAreaDialogOK : function(oEvent) {
	    //Get value from input filed
		var oControllingAreaInput =  sap.ui.getCore().byId("SetControllingAreaDialog--input.ControllingArea");	
		var oControllingAreaInputValue = oControllingAreaInput.getValue().toUpperCase();
		//check not null	
		if (oControllingAreaInputValue.length == 0){
			sap.m.MessageBox.error(this.resourceBundle.getText("MSG_KOKRS_NOTNULL"));
		}else{
			//set value to back end
			this.getSetControllingArea(oControllingAreaInputValue,"SET");
			var iresult = this.getView().getModel("mControllingArea").oData.results[0];
		    var msg =  this.resourceBundle.getText("KOKRS_SAVE_OK");
		    var onWMESSAGEOK= function() {
					   jQuery.sap.require("sap.m.MessageToast");
					   sap.m.MessageToast.show(msg);					
				};
			//if set error
		    if (iresult.IS_ERROR == 'X'){
				if  (iresult.MESSAGETYPE == "E"){
						sap.m.MessageBox.error(iresult.MESSAGE);
						}
				else if (iresult.MESSAGETYPE == "W"){
							sap.m.MessageBox.warning(iresult.MESSAGE);
					    }	
			}else{							
			    if  (iresult.MESSAGETYPE == "S"){	
			    	onWMESSAGEOK();
			    };
			    	this.SetControllingAreaDialog.close();			    	 
			}	
		}
	},

	/** 
	 *  @description Event handler when  Controlling Area  Cancel button was hit.
	 *  @param oEvent
	 */
	onControllingAreaDialogCancel : function(oEvent) {
		this.SetControllingAreaDialog.close();			
	},
	
	/** 
	 *  Event handler when APP exit
	 *  @param oEvent
	 */  
	onExit : function(oEvent) {
		  if(this.SetControllingAreaDialog){
	             this.SetControllingAreaDialog.destroy(true);
	       };
	      if(this._valueHelpDialog){
	          this._valueHelpDialog.destroy(true);
	          };
		},  
		
		
	/** 
	*  Event handler when click the personname link
	*  @param oEvent
	*/  
		
	pNameCard4Usnam: function(oEvent) {	
			this.onEmployeeLaunch(oEvent,"Usnam");
		},
		
	pNameCard :function(oEvent) {	
			this.onEmployeeLaunch(oEvent,"VerakUser");
		},
		
	onEmployeeLaunch : function(oEvent,fuser) {			
			 var selectedDetail = oEvent.getSource().getBindingContext().getObject();
				if (!selectedDetail) {
					return;
				}
				var oParameters =  ["USERNAME=" + "'" + selectedDetail[fuser]+ "'"  ];		
				var oModel = this.getView().getModel();		
				var that = this;
				var successCallback = jQuery.proxy(function(oData, oResponse){
					var m = new sap.ui.model.json.JSONModel(); 
					m.setData(oData);
			
					var oEmpConfig = {
							title : "Employee",
			   			   name : oData.results[0]["FULL_NAME"],
		  				   imgurl : "sap-icon://person-placeholder",
		  				   department :  oData.results[0]["DEPARTMENT"],
		  				   contactmobile : oData.results[0]["MOBILE"],
		 				   contactphone : oData.results[0]["TELEPHONE"],
		 				   contactemail : oData.results[0]["E_MAIL"],
		 				   companyname : oData.results[0]["COMPANYNAME"],
		  			       companyaddress : oData.results[0]["Street"]
			   		};
	
			   		//call 'Business Card' reuse component
			   		var oEmployeeLaunch = new sap.ca.ui.quickoverview.EmployeeLaunch(oEmpConfig);
			   		oEmployeeLaunch.openBy(oEvent.getSource());
				},this);
				
				oModel.read("GetNameCardProfile", null, oParameters, false, successCallback, 
						jQuery.proxy(this.onRequestFailed, this)
				);
					
		},
	
		onRowSelect : function(oEvent){       // only when a row is selected the function button are active.
		    	//var _that=this.getView().byId("fin.co.costcenter.manage.table");
			    var _that=this;
		    	  var oOptions1 = {
		          		
		              	aAdditionalSettingButtons: [{		
		              			sI18nBtnTxt: this.resourceBundle.getText("SETTINGS"),
		                          sIcon: "sap-icon://settings",
		                          onBtnPressed: function(oEvent){
		                          	_that.onSetControllingAreaDialog();}
		              		     }],           	             		
		                  buttonList : [
		      			{
		      			    sI18nBtnTxt : "BTN_DISPLAY",
		      			    onBtnPressed : function(evt) {
		      			    	_that.onNavi("DISPLAY");
		      			    }
		      			},             {
		      		        sI18nBtnTxt : "BTN_ADD",
		      		        onBtnPressed : function(evt) {
		      		        	_that.checkCreate("NEW");
		      		        }
		        			}, 
		                  {
		                  	sI18nBtnTxt : "BTN_COPY",
		                      onBtnPressed : function(evt) {
		                      	_that.checkCreate("COPY");
		                      }
		                  },
		                  {
		                  	sI18nBtnTxt : "BTN_EDIT",
		                  	onBtnPressed : function(evt) {           	
		                  		_that.checkEdit();
		                  	}
		                  }
		              	],
		      			oJamOptions : {
		      				// to get share on JAM
		      				fGetShareSettings : function(){
		      					var description = "";
		      					return {
		      						object: {
		      							id: _that._getShareID(),
		      							share: description, 
		      							display: _that._getShareDisplay()
		      						}	
		      					};
		      				}
		      		 }

		              };
		    	  var oOptions = {
		          		
		    	        	aAdditionalSettingButtons: [{		
		    	        			sI18nBtnTxt: this.resourceBundle.getText("SETTINGS"),
		    	                    sIcon: "sap-icon://settings",
		    	                    onBtnPressed: function(oEvent){
		    	                    	_that.onSetControllingAreaDialog();}
		    	        		     }],
		        		     buttonList : [
		        			      			{
		        			      			    sI18nBtnTxt : "BTN_ADD",
		        			      			    onBtnPressed : function(evt) {
		        			      			    	_that.onNavi("NEW");
		        			      			    }
		        			      			}]
		    	        };
		    	        
		    
		   if(this._getSelectedRows().length !==0){
		    	  if (this.extHookGetSettingsButton) {
		             this.extHookGetSettingsButton(oOptions1);
		      }
		      this.setHeaderFooterOptions(oOptions1);
		    }
		   else{
			   if (this.extHookGetSettingsButton) {
		           this.extHookGetSettingsButton(oOptions);
		    }
		    this.setHeaderFooterOptions(oOptions);
		   }
			   
		    },
		    
		    
		    onCellClick: function(oEvent){
		    	var oTable = this.getView().byId("fin.co.costcenter.manage.table");
		    	var x = oEvent.getParameters().rowIndex;
		    	oTable.setSelectedIndex(x);
		    	this.onRowSelect(oEvent);
		    },
		    
		
	
    /**
     * @description Convert JS Date object to ABAP DATUM format
     * @param date
     * @returns string in datum format
     */
    _convertDateObj2DATUM : function(date){
    	// pad number with '0'
    	var pad = function(i){
    		i = i + '';
    		return i.length >= 2 ? i : "0" + i;
    	};
    	// DATUM format
    	return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate());
    },
    
    /*
     * Standard Navigation Guideline Adoption
     */
	storeCurrentAppState : function() {
		var oStoreAppStatePromise = this.oNavigationHandler.storeInnerAppState(this.getCurrentAppState());
		oStoreAppStatePromise.done(function(sAppStateKey){
			//your inner app state is saved now, the sAppStateKey is added to your URL
			//perform actions that should run after saving
		});
		oStoreAppStatePromise.fail(function(oError) {
            //store inner app state failure handling
        });
		return oStoreAppStatePromise;
	},
	
	getCurrentAppState : function() {
		var oSelectionVariant = new  sap.ui.generic.app.navigation.service.SelectionVariant(this.oSmartFilterBar.getDataSuiteFormat());
        var aVisibleFields = this.getVisibleSelectionsWithDefaults();
        for (var i = 0; i < aVisibleFields.length; i++) {
            if (!oSelectionVariant.getValue(aVisibleFields[i])) {
                oSelectionVariant.addSelectOption(aVisibleFields[i], "I", "EQ", "");
            }
        }
        return {
            selectionVariant: oSelectionVariant.toJSONString(),
            tableVariantId: this.oSmartTable.getCurrentVariantId(),
            customData: this.getCustomAppStateData()
        };
	},
	
    /**
     * @returns {array} a list of selection fields in the SmartFilterBar with defaults
     */
    getVisibleSelectionsWithDefaults: function() {
        // We need a list of all selection fields in the SmartFilterBar for which defaults are defined
        // (see method setSmartFilterBarDefaults) and which are currently visible.
        // This is needed by _getBackNavigationParameters in the NavigationController.
        var aVisibleFields = [];
        return aVisibleFields;
    },
    
    /**
     * @returns {object} an object of additional custom fields defining the app state (apart from the selection variant and the table variant)  
     */
    getCustomAppStateData: function() {
        return {
            // add custom data for back navigation if necessary
        };
    },
    
    restoreCustomAppStateData: function(oCustomData) {
        // perform custom logic for restoring the custom data of the app state
    },
    
    onListNavBack : function () {
		var oHistory = sap.ui.core.routing.History.getInstance(),
			sPreviousHash = oHistory.getPreviousHash(),
			oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

		if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
			history.go(-1);
		} else {
			this.getRouter().navTo("master", {}, true);
		}
	},
	
	/*
     * Smart Link adoption
     */
    onBeforePopoverOpens: function(oEvent) {
		var oParams = oEvent.getParameters();
		var sSelectionVariant = this.oSmartFilterBar.getDataSuiteFormat();
		this.oNavigationHandler.processBeforeSmartLinkPopoverOpens(oParams, sSelectionVariant);
	},
	
	onNavTargetsObtained : function(oEvent) {
		var oParameters = oEvent.getParameters();
        var obj = oParameters.semanticAttributes;
        var ControllingArea = (obj.Kokrs !== undefined)? obj.Kokrs : "";
        var CostCenter = this.formatKostl((obj.Kostl !== undefined) ? obj.Kostl : "");
        var CostCenterDesc = (obj.CostCenter !== undefined) ? obj.CostCenter : (obj.Ltext !== undefined ? obj.Ltext : "");
        var ProfitCenter = (obj.Prctr !==undefined) ? obj.Prctr : (obj.ProfitCenter !== undefined ? obj.ProfitCenter : "");
        var ProfitCenterDesc = (obj.Ktext !== undefined) ? obj.Ktext : "";
        var ValidTo = this.DateFormatter(obj.Datbi !== undefined ? obj.Datbi : "");
        var ValidFrom = this.DateFormatter(obj.Datab !== undefined ? obj.Datab : "");
        var title = "", stext = "", shref = "";
        if (oParameters.semanticObject === "CostCenter") {
        	title = CostCenterDesc;
        	stext = this.resourceBundle.getText("DISPLAY_CC");
        	shref = "CostCenter-openCostCenter?FPM_START_PAGE_ID=FCOM_OVP_INIT&IV_EDIT_MODE=DISPLAY&IV_KOKRS=";
        	shref += ControllingArea + "&IV_KOSTL=" + CostCenter;
        	shref += "&IV_DATBI=" + ValidTo + "&IV_DATAB=" + ValidFrom;
        } else if(oParameters.semanticObject === "ProfitCenter"){
        	title = ProfitCenterDesc;
        	stext = this.resourceBundle.getText("DISPLAY_PC");
        	shref = "ProfitCenter-openProfitCenter?FPM_START_PAGE_ID=FPM_CREATE_PAGE&EDIT_MODE=DISPLAY&CONTROLLINGAREA=";
        	shref += ControllingArea + "&PROFITCENTER=" + ProfitCenter;
        	shref += "&VALIDTODATE=" + ValidTo + "&VALIDFROMDATE=" + ValidFrom;
        }
        
        oParameters.show(title,
              new sap.ui.comp.navpopover.LinkData({
                  text: stext,
                  href: shref
              }),
              [],
              new sap.ui.layout.form.SimpleForm({
	      			maxContainerCols: 1
	      	  }));
	},
	
	onSmartLinkNavigate: function(oEvent) {
		this.storeCurrentAppState();
	},
	
	onPrefetchNavTargets: function(oEvent) {
//		this.semanticObjects = oEvent.getParameter("semanticObjects");
	},
	
	onPopoverLinkPressed : function(oEvent) {
		//inner Navigate is called if a link in the navigation popover is pressed.
		this.storeCurrentAppState();
	},
	
	DateFormatter : function(date){
	    var dateValidFromdate = new Date(date);
  		var dateGetMonth = dateValidFromdate.getMonth()+1;
  		var dateGetDate = dateValidFromdate.getDate();
  		var dateGetmothfunction = this.oGetMonthtransform(dateGetMonth);
  		var dateGetDatefunction = this.oGetMonthtransform(dateGetDate);
  		var oValiFromDate = dateValidFromdate.getFullYear() + "" + dateGetmothfunction + "" + dateGetDatefunction;
  		return oValiFromDate;
     },
     
     oGetMonthtransform : function (oEvent){
   	  if(oEvent>="10"){
   		  return oEvent;
   	  }else{
   		  return "0" + oEvent;
   	  }
     },
     
     formatKostl : function (_kostl){
    	if(!isNaN(_kostl)) {		
 			var len = 10 - _kostl.length;
 			var zero = "";
 			if(len > 0)
 			{
 				for(var i=0;i<len;i++)
 				{
 					zero = "0" + zero;
 				}	
 			}
 			_kostl = zero + _kostl;
 		}
    	return _kostl;
     }
    
//    onDataExport : function(){
//    	var that = this;
//    	var oEntityContainer = this.getView().getModel().getServiceMetadata().dataServices.schema[0].entityContainer;
//    	var bExcelSupported = false;
//    	for (var i = 0; i < oEntityContainer.length; i++) {
//    	    if (oEntityContainer[i].isDefaultEntityContainer) {
//    	        if (oEntityContainer[i].extensions) {
//    	            for (var j = 0; j < oEntityContainer[i].extensions.length; j++) {
//    	                if (oEntityContainer[i].extensions[j].name == "supported-formats") {
//    	                    if (oEntityContainer[i].extensions[j].value.indexOf("xlsx") >= 0) {
//    	                        bExcelSupported = true;
//    	                    }
//    	                    break;
//    	                }
//    	            }
//    	        }
//    	        break;
//    	    }
//    	}
//    	if (bExcelSupported) {
//    	    var oButton = new sap.m.Button("TableToolbarExportBtn", {
//    	        tooltip: this.getView().getModel('i18n').getResourceBundle().getText("TABLE_EXPORT_TEXT"),
//    	        icon: "sap-icon://excel-attachment",
//    	        press: function(oEvent) {
//    	            var oTable = that.getView().byId("fin.co.costcenter.manage.table");                	             
//    	            if (oTable.getBinding("rows").getLength() > 10000) {
//    	                var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
//    	                jQuery.sap.require("sap.m.MessageBox");
//    	                sap.m.MessageBox.confirm(that.getView().getModel('i18n').getResourceBundle().getText("DOWNLOAD_CONFIRMATION_TEXT", oTable.getTotalSize()), {
//    	                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
//    	                    styleClass: bCompact ? "sapUiSizeCompact" : "",
//    	                    onClose: function(oAction) {
//    	                        if (oAction == sap.m.MessageBox.Action.YES) {
//    	                            var sUrl = oTable.getBinding("rows").getDownloadUrl("xlsx");
//    	                            window.open(sUrl);
//    	                        }
//    	                    }
//    	                });
//    	            } else {
//    	                var sUrl = oTable.getBinding("rows").getDownloadUrl("xlsx");
//    	                window.open(sUrl);
//    	            }
//    	        }
//    	    });
//    	    this.getView().byId('TableToolbar').addContent(oButton);
//    	    oButton.setEnabled(false);
//    	}    } 
    	
});