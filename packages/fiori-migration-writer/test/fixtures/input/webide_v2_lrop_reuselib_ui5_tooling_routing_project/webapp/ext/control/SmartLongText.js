sap.ui.define(
    [
        'sap/ui/core/Control',
        'sap/ui/comp/smartfield/SmartField',
        'i2d/qm/defect/records1/ext/control/SmartLongTextControlFactory'
    ],
    function (Control, SmartField, SmartLongTextControlFactory) {
        'use strict';
        return SmartField.extend('i2d.qm.defect.records1.ext.control.SmartLongText', {
            _createFactory: function (sModelName, oModel, sBindingPath, oConfig) {
                //retrieve the default control factory from super class to use the same parameters for the creation of SmartLongTextControlFactory
                var oDefaultControlFactory = SmartField.prototype._createFactory.apply(this, arguments);

                if (oDefaultControlFactory) {
                    return new SmartLongTextControlFactory(oModel, this, oDefaultControlFactory._oMeta);
                } else {
                    return null;
                }
            },
            renderer: function (oRm, oControl) {
                sap.ui.comp.smartfield.SmartField.prototype.getRenderer().render.apply(this, arguments);
            }
        });
    }
);
