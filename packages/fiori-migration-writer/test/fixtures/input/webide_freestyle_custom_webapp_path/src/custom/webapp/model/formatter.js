/*!
 * ${copyright}
 */

sap.ui.define(['sap/m/Label'], function (Label) {
    'use strict';

    return {
        /**
         * Example. Use this file to define formatters used in the XML views.
         * See List.controller.js on how the formatter is included in the controller.
         * @public
         * @param {object} arbitrary object
         * @returns {object} identical object
         */
        identity: function (oObj) {
            return oObj;
        }
    };
});
