function initModel() {
    var sUrl = '/V2/Northwind/Northwind.svc/';
    var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
    sap.ui.getCore().setModel(oModel);
}
