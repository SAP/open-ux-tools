sap.ui.define([], function () {
    'use strict';

    var ListReportExt = sap.ui.controller('i2d.qm.defect.records1.ext.controller.ListReportExt', {
        onInit: function () {},

        onBeforeRebindTableExtension: function (oEvent) {
            //=== case dependent handling of before rebind table event
            switch (oEvent.getSource().getId()) {
                case 'i2d.qm.defect.records1::sap.suite.ui.generic.template.ListReport.view.ListReport::C_DefectRecord--listReport':
                    //=== add a filter to ensure that no deleted defects will be selected
                    var oOwnMultiFilter = new sap.ui.model.Filter([
                        new sap.ui.model.Filter('IsDeleted', sap.ui.model.FilterOperator.EQ, false)
                    ]);
                    break;

                default:
                    return;
            }

            //=== add new filters to the current ones - if necessary
            if (oOwnMultiFilter) {
                //=== get binding parameters
                var oBindingParameters = oEvent.getParameter('bindingParams');
                if (oBindingParameters) {
                    //=== add new filters - if an internal multi-filter exists then combine custom multi-filters and internal multi-filters with an AND
                    if (oBindingParameters.filters[0] && oBindingParameters.filters[0].aFilters) {
                        var oSmartTableMultiFilter = oBindingParameters.filters[0];
                        oBindingParameters.filters[0] = new sap.ui.model.Filter(
                            [oSmartTableMultiFilter, oOwnMultiFilter],
                            true
                        );
                    } else {
                        oBindingParameters.filters.push(oOwnMultiFilter);
                    }
                }
            }
        }
    });

    return ListReportExt;
});
