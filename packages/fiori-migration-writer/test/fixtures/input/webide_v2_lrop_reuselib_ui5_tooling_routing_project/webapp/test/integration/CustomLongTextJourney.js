sap.ui.define(['sap/ui/test/opaQunit', 'sap/ui/test/Opa5'], function (opaTest, Opa5) {
    'use strict';

    QUnit.module('Custom Long Text Journey');

    Opa5.extendConfig({
        appParams: {
            'sap-ui-animation': false
        }
    });

    opaTest('Should see the custom long text in display mode', function (Given, When, Then) {
        Given.iStartTheAppAction({
            hash: "/C_DefectRecord(DefectInternalID='%252400000000372',DraftUUID=guid'00000000-0000-0000-0000-000000000000',IsActiveEntity=true)"
        });
        Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect('372');

        Then.onTheGenericObjectPage
            .iShouldSeeTheDataField('DefectLongTextCustom', {
                Enabled: true,
                Editable: false,
                Mandatory: false
            })
            .and.iTeardownMyAppFrame();
    });

    opaTest('Should see the custom long text in edit mode', function (Given, When, Then) {
        Given.iStartTheAppAction({
            hash: "/C_DefectRecord(DefectInternalID='%252400000000374',DraftUUID=guid'10000000-1000-1000-1000-100000000000',IsActiveEntity=false)"
        });
        Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect('374');

        Then.onTheGenericObjectPage
            .iShouldSeeTheDataField('DefectLongTextCustom', {
                Enabled: true,
                Editable: true,
                Mandatory: false
            })
            .and.iTeardownMyAppFrame();
    });
});
