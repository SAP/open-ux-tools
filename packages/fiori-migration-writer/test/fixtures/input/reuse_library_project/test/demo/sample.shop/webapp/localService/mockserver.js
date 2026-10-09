sap.ui.define(['sap/ui/core/util/MockServer'], function (MockServer) {
    'use strict';
    var oMockServer;
    return {
        init: function () {
            var sPath = 'Demo/localService/mockdata';
            // create
            var sMockServerUrl = '/sap/opu/odata';

            oMockServer = new MockServer({
                rootUri: sMockServerUrl
            });
            var aRequests = oMockServer.getRequests();
            aRequests.push({
                method: 'GET',
                path: new RegExp('.*CA_FM_FEATURE_TOGGLE_STATUS_SRV/ToggleStatusSet.*'),
                response: function (oXhr, sUrlParams) {
                    var sUrl = jQuery.sap.getModulePath(sPath) + '/GetFeaturesAsync.json';
                    var oResponse = jQuery.sap.sjax({
                        url: sUrl
                    });
                    var oResult = oResponse.data;
                    oXhr.respondJSON(200, {}, oResult);
                    return true;
                }
            });
            oMockServer.setRequests(aRequests);
            oMockServer.start();
        }
    };
});
