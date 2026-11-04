sap.ui.define(
    [
        'fin/central/listreport/reuse/controller/BaseController',
        'sap/ui/core/routing/History',
        'sap/ui/core/routing/HashChanger'
    ],
    function (BaseController, History, HashChanger) {
        'use strict';

        return BaseController.extend('fin.central.listreport.reuse.controller.NotFound', {
            /**
             * Navigates back in the browser history, if the entry was created by this app.
             * @public
             * @param {object} oEvent the event object
             */
            onBackNav: function (oEvent) {
                var oHashChanger = HashChanger.getInstance();
                var sCurrentHash = oHashChanger.getHash();
                var sPreviousHash = History.getInstance().getPreviousHash();

                if (sPreviousHash !== undefined) {
                    //The history contains a previous entry
                    /*eslint-disable */
				window.history.go(-1);
				/*eslint-enable */
                } else if (sCurrentHash !== '') {
                    // The history doesn't contain a previous entry, but the app was called with a not existing deep link
                    // call the app in initial state without any parameters
                    this.getRouter().navTo('fullscreen', {}, true);
                } else {
                    // navigate back to FLP home
                    var oCrossAppNavigator =
                        sap.ushell &&
                        sap.ushell.Container &&
                        sap.ushell.Container.getService('CrossApplicationNavigation');
                    if (oCrossAppNavigator) {
                        oCrossAppNavigator.toExternal({
                            target: { shellHash: '#' }
                        });
                    }
                }
            }
        });
    }
);
