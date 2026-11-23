sap.ui.define(['sap/ui/comp/smartfield/ODataControlFactory'], function (ODataControlFactory) {
    'use strict';
    return ODataControlFactory.extend('i2d.qm.defect.records1.ext.control.SmartLongTextControlFactory', {
        _createEdmDisplay: function () {
            var oInnerControl,
                mNames = {
                    width: true,
                    textAlign: true
                };

            var mAttributes = this.createAttributes(null, this._oMetaData.property, mNames);
            mAttributes.value = {
                model: this._oMetaData.model,
                path: this._oHelper.getEdmDisplayPath(this._oMetaData),
                type: this._oTypes.getType(this._oMetaData.property)
            };
            mAttributes.editable = false;

            //retrieve settings from custom data aggregation "multiLineSettings" (like ODataControlFactory.prototype._createMultiLineText)
            var mOptions = this.getFormatSettings('multiLineSettings');
            mAttributes = jQuery.extend(true, mAttributes, mOptions);

            oInnerControl = new sap.m.TextArea(this._oParent.getId() + '-text', mAttributes);

            return {
                control: oInnerControl,
                onCreate: '_onCreate',
                params: {
                    noValidations: true
                }
            };
        }
    });
});
