
jQuery.sap.declare("fin.co.costcenter.manage.Configuration");
jQuery.sap.require("sap.ca.scfld.md.ConfigurationBase");
jQuery.sap.require("sap.ca.scfld.md.app.Application");

sap.ca.scfld.md.ConfigurationBase.extend("fin.co.costcenter.manage.Configuration", { 

	oServiceParams: {
		serviceList: [
			{
				name: "CostCenterMasterData",
				 masterCollection: "CostCenterSet",
//				serviceUrl: "/sap/opu/odata/sap/fcom_costcenter_srv/",
				 serviceUrl: fin.co.costcenter.manage.Component.getMetadata().getManifestEntry("sap.app").dataSources["CostCenterMasterData"].uri,
				metadataParams: "sap-documentation=heading,quickinfo",
				isDefault: true,
				useBatch : true,
//				mockedDataSource: "/fin.co.costcenter.manage/model/metadata.xml"
				mockedDataSource: jQuery.sap.getModulePath("fin.co.costcenter.manage") + "/" + fin.co.costcenter.manage.Component.getMetadata().getManifestEntry("sap.app").dataSources["CostCenterMasterData"].settings.localUri
					
			}
		]
	},

	getServiceParams: function () {
		return this.oServiceParams;
	},

	getAppConfig: function() {
		return this.oAppConfig;
	},

	/**
	 * @inherit
	 */
	getServiceList: function () {
		return this.oServiceParams.serviceList;
	},

	getMasterKeyAttributes: function () {
		return ["Id"];
	}

});
