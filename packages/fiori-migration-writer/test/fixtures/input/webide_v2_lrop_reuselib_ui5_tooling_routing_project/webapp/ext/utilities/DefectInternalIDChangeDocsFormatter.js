sap.ui.define(
    [],
    function () {
        'use strict';

        var Formatter = {
            convertDefectIDToArray: function (sDefectInternalID) {
                var sDefID = sDefectInternalID;
                return [sDefID]; // Change Doc Reuse Component config expects an array for ID
            }
        };
        return Formatter;
    },
    true
);
