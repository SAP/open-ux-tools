sap.ui.define(['sap/ui/core/mvc/ControllerExtension'], function (ControllerExtension) {
    'use strict';
    return ControllerExtension.extend('adp.example.share', {
        onBtnPress: function () {
            sap.m.MessageToast.show('Button pressed!');
        }
    });
});
