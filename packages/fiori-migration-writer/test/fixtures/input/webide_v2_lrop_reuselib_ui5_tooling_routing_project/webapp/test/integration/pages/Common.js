sap.ui.define(['sap/ui/test/Opa5'], function (Opa5) {
    'use strict';

    function getFrameUrl(sHashParameter, sUrlParameters) {
        var sUrl = jQuery.sap.getResourcePath('i2d/qm/defect/records1/app', '.html');
        var sHash = sHashParameter || '';
        var sUrlParams = sUrlParameters ? '?' + sUrlParameters : '';

        if (sHash) {
            sHash = '#masterDetail-display&/' + (sHash.indexOf('/') === 0 ? sHash.substring(1) : sHash);
        } else {
            sHash = '#masterDetail-display';
        }

        return sUrl + sUrlParams + sHash;
    }

    return Opa5.extend('i2d.qm.defect.records1.test.integration.pages.Common', {
        iStartTheAppAction: function (oOptionsParam) {
            var oOptions = oOptionsParam || {};
            // Start the app with a minimal delay to make tests run fast but still async to discover basic timing issues
            this.iStartMyAppInAFrame(getFrameUrl(oOptions.hash, 'serverDelay=1000'));
        }
    });
});
