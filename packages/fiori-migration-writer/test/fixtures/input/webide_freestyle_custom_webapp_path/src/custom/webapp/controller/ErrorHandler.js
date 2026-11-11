sap.ui.define(['sap/ui/base/Object', 'sap/m/MessageBox', 'sap/ui/Device'], function (Object, MessageBox, Device) {
    'use strict';

    return Object.extend('fin.central.listreport.reuse.controller.ErrorHandler', {
        /**
         * @class Handles application errors by automatically attaching to the model events and displaying errors when needed.
         * @public
         * @alias fin.central.listreport.reuse.controller.ErrorHandler
         */
        constructor: function (oComponent) {
            this._oResourceBundle = oComponent.getModel('i18n').getResourceBundle();
            this._oComponent = oComponent;
            this._oModel = oComponent.getModel();
            this._bMessageOpen = false;

            this._oModel.attachEvent(
                'metadataFailed',
                function (oEvent) {
                    var oParams = oEvent.getParameters();

                    this._showMetadataError(
                        oParams.statusCode +
                            ' (' +
                            oParams.statusText +
                            ')\r\n' +
                            oParams.message +
                            '\r\n' +
                            oParams.responseText +
                            '\r\n'
                    );
                },
                this
            );

            this._oModel.attachEvent(
                'requestFailed',
                function (oEvent) {
                    var oParams = oEvent.getParameters();

                    // An entity that was not found in the service is also throwing a 404 error in oData.
                    // We already cover this case with a notFound target so we skip it here.
                    // A request that cannot be sent to the server is a technical error that we have to handle though
                    // oParams.response.statusCode can be string or number
                    if (
                        oParams.response.statusCode != 404 ||
                        (oParams.response.statusCode == 404 &&
                            oParams.response.responseText.indexOf('Cannot POST') === 0)
                    ) {
                        var sMessage, oResponse;
                        try {
                            oResponse = jQuery.parseJSON(oEvent.getParameter('responseText'));
                        } catch (err) {
                            oResponse = null;
                        }

                        // display error message of OData service if available
                        if (
                            oResponse &&
                            oResponse.error &&
                            oResponse.error.innererror &&
                            oResponse.error.innererror.errordetails &&
                            oResponse.error.innererror.errordetails[0] &&
                            oResponse.error.innererror.errordetails[0].message
                        ) {
                            sMessage =
                                oParams.response.statusCode +
                                ' (' +
                                oParams.response.statusText +
                                ')\r\n' +
                                oResponse.error.innererror.errordetails[0].message;
                        } else {
                            sMessage =
                                oParams.response.statusCode +
                                ' (' +
                                oParams.response.statusText +
                                ')\r\n' +
                                oParams.response.message +
                                '\r\n' +
                                oParams.response.responseText +
                                '\r\n';
                        }
                        this._showServiceError(sMessage);
                    }
                },
                this
            );
        },

        /**
         * Shows a {@link sap.m.MessageBox} when the metadata call has failed.
         * The user can try to refresh the metadata.
         * @param {string} sDetails a technical error to be displayed on request
         * @private
         */
        _showMetadataError: function (sDetails) {
            MessageBox.show(this._oResourceBundle.getText('ERR_METADATA_TEXT'), {
                id: 'metadataErrorMessageBox',
                icon: MessageBox.Icon.ERROR,
                title: this._oResourceBundle.getText('ERR_METADATA_TITLE'),
                details: sDetails,
                styleClass: this._oComponent.getContentDensityClass(),
                actions: [MessageBox.Action.RETRY, sap.m.MessageBox.Action.CLOSE],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.RETRY) {
                        this.bMessageOpen = false;
                        this._oModel.refreshMetadata();
                    }
                }.bind(this)
            });
        },

        /**
         * Shows a {@link sap.m.MessageBox} when a service call has failed.
         * Only the first error message will be display.
         * @param {string} sDetails a technical error to be displayed on request
         * @private
         */
        _showServiceError: function (sDetails) {
            if (!this._bMessageOpen) {
                this._bMessageOpen = true;
                MessageBox.show(this._oResourceBundle.getText('ERR_SERVICE_TEXT'), {
                    id: 'serviceErrorMessageBox',
                    icon: MessageBox.Icon.ERROR,
                    title: this._oResourceBundle.getText('ERR_SERVICE_TITLE'),
                    details: sDetails,
                    styleClass: this._oComponent.getContentDensityClass(),
                    actions: [MessageBox.Action.CLOSE],
                    onClose: function (sAction) {
                        this._bMessageOpen = false;
                    }.bind(this)
                });
            }
        }
    });
});
