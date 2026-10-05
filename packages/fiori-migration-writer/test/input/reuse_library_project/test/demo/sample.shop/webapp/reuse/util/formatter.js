sap.ui.define(
    ['sap/ui/core/ValueState', 'sap/ui/core/format/NumberFormat'],
    function (ValueState, NumberFormat) {
        'use strict';

        var fnAmountFormatter = NumberFormat.getCurrencyInstance(),
            me = {
                _getResourceBundle: function () {
                    return sap.ui.getCore().getLibraryResourceBundle('nw.epm.refapps.shop.reuse');
                },

                /**
                 * Formatter for Availability - Displays Text or Text + Number
                 * @param {integer}
                 *            iAvailability The number of products on stock
                 * @returns {string} A textual representation of the availability
                 * @public
                 */
                formatAvailabilityText: function (iAvailability) {
                    if (iAvailability === null) {
                        return '';
                    }
                    if (iAvailability < 1) {
                        return me._getResourceBundle().getText('xfld.outOfStock');
                    }
                    if (iAvailability < 10) {
                        return me._getResourceBundle().getText('xfld.inStockLeft', [iAvailability]);
                    }
                    return me._getResourceBundle().getText('xfld.inStock');
                },

                /**
                 * Formatter for Availability - Displays Text in red (error) or green (success)
                 * @param {integer}
                 *            iAvailability The number of products on stock
                 * @returns {state} sap.ui.core.ValueState A color representation of the
                 *          availability
                 * @public
                 */
                formatAvailabilityStatus: function (iAvailability) {
                    if (iAvailability === null) {
                        return ValueState.None;
                    }
                    if (Number(iAvailability) < 1) {
                        return ValueState.Error;
                    }
                    if (Number(iAvailability) < 10) {
                        return ValueState.Warning;
                    }
                    return ValueState.Success;
                },

                formatAvailabilityTextFromCode: function (sAvailabilityText, iAvailabilityCode, iAvailability) {
                    if (iAvailabilityCode === 2 && iAvailability > 0) {
                        return me._getResourceBundle().getText('xfld.inStockLeft', [iAvailability]);
                    }
                    return sAvailabilityText || '';
                },

                formatAvailabilityStatusFromCode: function (iAvailabilityCode) {
                    if (!iAvailabilityCode === null) {
                        return ValueState.None;
                    }
                    if (iAvailabilityCode === 1) {
                        return ValueState.Error;
                    }
                    if (iAvailabilityCode === 2) {
                        return ValueState.Warning;
                    }
                    return ValueState.Success;
                },

                /**
                 * Formatter for Measures - Returns concatenated string with Measure and Unit
                 * @param {float}
                 *            fMeasure A measure
                 * @param {string}
                 *            sUnit A unit
                 * @returns {string} A combined textual representation of measure and unit
                 * @public
                 */
                formatMeasure: function (fMeasure, sUnit) {
                    if (!fMeasure || !sUnit) {
                        return '';
                    }
                    return me._getResourceBundle().getText('xfld.formatMeasure', [fMeasure, sUnit]);
                },

                /**
                 * Formatter for Amounts - Returns amount with formatted decimals
                 *
                 * Formatter is replaced in the latest version of the apps with the following declarative binding
                 * "{parts: [ {path: 'Price'}, {path: 'CurrencyCode'}],
                 *			type : 'sap.ui.model.type.Currency',
                 *			formatOptions: { showMeasure: false } }"
                 *
                 * To ensure the compatibility with older app versions this formatter is not deleted
                 * @param {fAmount}
                 *            fAmount An amount value
                 * @returns {string} A textual representation of amount with formatted decimals
                 * @public
                 */
                formatAmount: function (fAmount) {
                    if (!fAmount) {
                        return '';
                    }
                    return fnAmountFormatter.format(fAmount);
                }
            };

        return me;
        // Export parameter 'true' needed for backward compatibility.
        // Will be removed as soon as the usage of required is removed in all applications.
    },
    true
);
