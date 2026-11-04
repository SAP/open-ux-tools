jQuery.sap.declare("fin.co.costcenter.manage.utils.VariantManage");

fin.co.costcenter.manage.utils.VariantManage = function(context){
	
//  Variant Management  
    //  get the Transient Personalizer  
      var oPersonalizer = sap.ushell.Container.getService("Personalization").getTransientPersonalizer();
//          Table PersoController for Variant Management
      var oTablePersoController = new sap.ui.table.TablePersoController({
       table: context._table,
       autoSave: false,
       persoService: oPersonalizer
      });
      
        var that = context, oVariantManagement = '', oLabel = '', sVariantKey = '', bNoSelectEvent = false;
        oVariantManagement = new sap.ui.comp.variants.VariantManagement("VariantManagement", {
        	   save: function(oEvent) {
        	    var sKey = oEvent.getParameter("key"),
        	     sTitle = oEvent.getParameter("name");
        	    var oVariant='';
        	    if (!oEvent.getParameter("overwrite")) {
        	     if(!that.oVariantSet.getVariantKeyByName(sTitle)){
        	      oVariant = that.oVariantSet.addVariant(sTitle);
        	      sVariantKey = oVariant.getVariantKey();
        	     }else{
        	      sVariantKey = that.oVariantSet.getVariantKeyByName(sTitle);
        	      oVariant = that.oVariantSet.getVariant(sVariantKey);
        	      //Display information message "Existing variant {0} was overwritten"      
        	      sap.m.MessageToast.show(that.getView().getModel('i18n').getResourceBundle().getText("VARIANT_OVERWITTEN", sTitle));      
        	     }     
        	    } else {
        	     oVariant = that.oVariantSet.getVariant(sKey);
        	     sVariantKey = sKey;
        	    }
        	    if (oEvent.getParameter("def")) {
        	     that.oVariantSet.setCurrentVariantKey(sVariantKey);
        	     oVariantManagement.setDefaultVariantKey(sVariantKey);
        	    }else if (that.oVariantSet.getCurrentVariantKey() == sVariantKey){
        	     that.oVariantSet.setCurrentVariantKey('');
        	     oVariantManagement.setDefaultVariantKey('');
        	    }
        	    
        	    oTablePersoController.savePersonalizations();
        	      if (oVariant) {  
        	       oVariant.setItemValue("table", oPersonalizer.getValue());  
        	       that.oContainer.save()
        	        .fail(function() {
        	        })
        	        .done(function() {                   
        	           var oVariantList = that.oVariantSet.getVariantKeys(); 
        	           var oVariantData={ variant: [] };
        	           for (var i=0; i<oVariantList.length; i++){
        	            oVariantData.variant.push({
        	            text: that.oVariantSet.getVariant(oVariantList[i]).getVariantName(),
        	              key: oVariantList[i]
        	            });
        	           };
        	           oVariantData.variant.sort(function (a, b) {
        	              if (a.text > b.text)
        	                return 1;
        	              if (a.text < b.text)
        	                return -1;
        	              // a must be equal to b
        	              return 0;
        	           });           
        	           var sVariantKey_ = sVariantKey;
        	           oVariantManagement.destroyItems();      
        	           bNoSelectEvent = true;       
        	           for (var i=0; i<oVariantData.variant.length; i++){
        	            oVariantManagement.addItem(new sap.ui.core.Item({text: oVariantData.variant[i].text,
        	             key: oVariantData.variant[i].key}));
        	           }; 
        	           oVariantManagement.setInitialSelectionKey(sVariantKey_);
        	           sVariantKey = sVariantKey_;
        	           bNoSelectEvent = false;
        	        });
        	      }   
        	   },
        	   manage: function(oEvent) {
        	    var aRenamed = oEvent.getParameter("renamed"),
        	     aDeleted = oEvent.getParameter("deleted"),
        	     bDeleted = false;
        	    for (var i = 0; i < aRenamed.length; i++) {
        	     var oVariant = that.oVariantSet.getVariant(aRenamed[i].key);     
        	     var oItemValue = oVariant.getItemValue("table");
        	     that.oVariantSet.delVariant(aRenamed[i].key);
        	     oVariant = that.oVariantSet.addVariant(aRenamed[i].name);
        	     oVariant.setItemValue("table", oItemValue);  
        	    }
        	    for (var i = 0; i < aDeleted.length; i++) {
        	     that.oVariantSet.delVariant(aDeleted[i]);
        	     if(that.oVariantSet.getCurrentVariantKey()==that.oVariantSet.delVariant(aDeleted[i])){
        	      bDeleted = true;
        	     }
        	    }
        	    that.oContainer.save()
        	    .fail(function() {
        	     // error handling
        	    })
        	    .done(function() {
        	     if(aRenamed.length){
        	        var oVariantList = that.oVariantSet.getVariantKeys(); 
        	        var oVariantData={ variant: [] };
        	        for (var i=0; i<oVariantList.length; i++){
        	         oVariantData.variant.push({
        	         text: that.oVariantSet.getVariant(oVariantList[i]).getVariantName(),
        	           key: oVariantList[i]
        	         });
        	        };
        	        oVariantData.variant.sort(function (a, b) {
        	           if (a.text > b.text)
        	             return 1;
        	           if (a.text < b.text)
        	             return -1;
        	           // a must be equal to b
        	           return 0;
        	        });            
        	        oVariantManagement.destroyItems();      
        	        bNoSelectEvent = true;       
        	        for (var i=0; i<oVariantData.variant.length; i++){
        	         oVariantManagement.addItem(new sap.ui.core.Item({text: oVariantData.variant[i].text,
        	          key: oVariantData.variant[i].key}));
        	        };
        	        bNoSelectEvent = false;       
        	     }
        	     if(bDeleted){
        	      oVariantManagement.setInitialSelectionKey('');
        	      that.oVariantSet.setCurrentVariantKey('');
        	     }else{
        	      oVariantManagement.setInitialSelectionKey(sVariantKey);
        	     }
        	    });   
        	   },
        	   select: function(oEvent) {
        	    if(!bNoSelectEvent){
        	     sVariantKey = oEvent.getParameter("key");
        	     var oVariant = that.oVariantSet.getVariant(sVariantKey);
        	     if(oVariant){
        	      oPersonalizer.setValue(oVariant.getItemValue("table"));
        	      oTablePersoController.refresh();      
        	     }
        	    }
        	   }
        	  });
        	 // oLabel = new sap.m.Label({labelFor: "VariantManagement", text: context.getView().getModel('i18n').getResourceBundle().getText("VARIANT_LABEL")+':'});
        	 // context.getView().byId('TableToolbar').addContent(oLabel);
        	  context.getView().byId('TableToolbar').addContent(oVariantManagement);
        	  
        	  //add button
              var oButton = new sap.m.Button({ icon: "sap-icon://action-settings",
            	  tooltip: "{i18n>Personalization}",
      			press: jQuery.proxy(function(oEvent) {
  	    			oTablePersoController.openDialog();
      			}, context)
      		});
              context.getView().byId('TableToolbar').addContent(oButton);
              
              
        	  sap.ushell.Container.getService("Personalization").getContainer("fin.co.costcenter.variants", { validity : Infinity})  
        	    .fail( function() {
        	    })
        	    .done(function(oContainer) {       
        	     that.oContainer = oContainer;       
        	 
        	     that.oVariantSetAdapter = new sap.ushell.services.Personalization.VariantSetAdapter(oContainer);        
        	     that.oVariantSet = that.oVariantSetAdapter.getVariantSet("Default"); 
        	     if(!that.oVariantSet){
        	      that.oVariantSetAdapter.addVariantSet("Default");
        	      that.oVariantSet = that.oVariantSetAdapter.getVariantSet("Default");
        	     }
        	     var oVariantList = that.oVariantSet.getVariantKeys();      
        	     var oVariantData={ variant: [] };
        	     for (var i=0; i<oVariantList.length; i++){
        	      oVariantData.variant.push({
        	      text: that.oVariantSet.getVariant(oVariantList[i]).getVariantName(),
        	        key: oVariantList[i]
        	      });
        	     };
        	     oVariantData.variant.sort(function (a, b) {
        	        if (a.text > b.text)
        	          return 1;
        	        if (a.text < b.text)
        	          return -1;
        	        // a must be equal to b
        	        return 0;
        	     });    
        	     that.oModel = new sap.ui.model.json.JSONModel(oVariantData);
        	     oVariantManagement.setModel(that.oModel);
        	     var oItemVariantTemplate = new sap.ui.core.Item({
        	     text : "{text}",
        	     key: "{key}"
        	     });
        	     oVariantManagement.bindAggregation("items", "/variant", oItemVariantTemplate);
        	     // default variant
        	     sVariantKey = that.oVariantSet.getCurrentVariantKey();       
        	     if(sVariantKey){
        	     var oVariant = that.oVariantSet.getVariant(sVariantKey);
        	     if(oVariant){
        	      oVariantManagement.setInitialSelectionKey(sVariantKey); 
        	      oVariantManagement.setDefaultVariantKey(sVariantKey);
        	      oPersonalizer.setValue(oVariant.getItemValue("table"));
        	      oTablePersoController.refresh();
        	     }
        	     }   
        	    });  
	
};
		
		
		