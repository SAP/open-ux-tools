sap.ui.define(['sap/ui/core/util/MockServer'], function (MockServer) {
    'use strict';
    return {
        init: function () {
            var fnGetJSONFromFile = function (sFileName) {
                var _oJSON = null;
                $.ajax({
                    async: false,
                    global: false,
                    url: '../localService/CA_FM_FEATURE_TOGGLE_STATUS_SRV/mockdata/' + sFileName,
                    dataType: 'json',
                    success: function (data) {
                        _oJSON = data;
                    }
                });
                return _oJSON;
            };
            // create
            var oMockServer = new MockServer({
                rootUri: '/sap/opu/odata/SAP/CA_FM_FEATURE_TOGGLE_STATUS_SRV/'
            });

            // configure
            MockServer.config({
                autoRespond: true,
                autoRespondAfter: 100
            });

            // simulate
            var sPath = jQuery.sap.getModulePath(
                'i2d.qm.defect.records1.localService.service_CA_FM_FEATURE_TOGGLE_STATUS_SRV'
            );
            oMockServer.simulate(sPath + '/metadata.xml', {
                sMockdataBaseUrl: sPath + '/mockdata',
                bGenerateMissingMockData: true
            });

            var aRequests = oMockServer.getRequests();

            aRequests.push({
                method: 'GET',
                path: new RegExp('.*ToggleStatusSet.*'),
                response: function (oXhr) {
                    var oResults = [];
                    oXhr.respond(
                        401,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    return oResults;
                }
            });

            aRequests.push({
                method: 'GET',
                path: new RegExp('.*'),
                response: function (oXhr) {
                    var oResults = [];
                    oXhr.respond(
                        401,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    return oResults;
                }
            });

            // start
            //oMockServer.attachBefore(sap.ui.core.util.MockServer.HTTPMETHOD.GET, this.callback);
            oMockServer.setRequests(aRequests);
            oMockServer.start();
        }
        // ,
        // 		callback: function(oEvent) {

        // 	var oXhr = oEvent.getParameter("oXhr");
        // 	console.dir(oXhr.url);
        // 	console.dir(oXhr);
        // }
    };
});
