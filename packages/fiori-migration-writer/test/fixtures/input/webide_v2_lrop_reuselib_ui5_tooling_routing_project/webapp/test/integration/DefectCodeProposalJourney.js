sap.ui.define(['sap/ui/test/opaQunit', 'sap/ui/test/Opa5'], function (opaTest, Opa5) {
    'use strict';

    QUnit.module('Defect Code Proposal Journey');

    Opa5.extendConfig({
        appParams: {
            'sap-ui-animation': false
        }
    });

    opaTest(
        'Should see the defect code proposals and the indicator after I entered a detailed description',
        function (Given, When, Then) {
            Given.iStartTheAppAction({
                hash: "/C_DefectRecord(DefectInternalID='%252400000000375',DraftUUID=guid'10000000-1000-1000-1000-100000000000',IsActiveEntity=false)"
            });
            Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect('375');

            Then.onTheGenericObjectPage.iShouldSeeTheDataField('DefectLongTextCustom', {
                Enabled: true,
                Editable: true,
                Mandatory: false
            });

            var vDefectCustomLongTextId =
                'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet1_1::DefectLongTextCustom::Field';
            var vDefectCodeFieldId =
                'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet1_2::DefectCode::Field';

            When.onTheObjectPage
                .iEnterADefectDetailedDescription(vDefectCustomLongTextId, 'lorem ipsum')
                .and.iWaitForSomeTime();
            Then.onTheObjectPage.iSeeTheFieldHasValueState(
                vDefectCodeFieldId,
                sap.ui.core.ValueState.Information,
                'Defect code proposals exist'
            );

            When.onTheObjectPage.iPressInTheCodeField(vDefectCodeFieldId);
            //we just check for any popover after the field was pressed and assume that it is the suggestions list
            Then.onTheGenericObjectPage.iShouldSeeThePopoverWithTitle('').and.iTeardownMyAppFrame();
        }
    );
});
