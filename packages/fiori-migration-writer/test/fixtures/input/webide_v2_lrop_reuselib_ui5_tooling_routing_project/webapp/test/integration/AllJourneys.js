jQuery.sap.require('sap.ui.qunit.qunit-css');
jQuery.sap.require('sap.ui.thirdparty.qunit');
jQuery.sap.require('sap.ui.qunit.qunit-junit');

QUnit.config.autostart = false; //i2d.qm.defect.records1

sap.ui.require(
    [
        'sap/ui/test/Opa5',
        'i2d/qm/defect/records1/test/integration/pages/Common',
        'sap/ui/test/opaQunit', //Don't move this item up or down, this might(?!) break everything!
        'sap/suite/ui/generic/template/integration/testLibrary/ListReport/pages/ListReport',
        'sap/suite/ui/generic/template/integration/testLibrary/ObjectPage/pages/ObjectPage',
        'i2d/qm/defect/records1/test/integration/pages/ObjectPage'
    ],
    function (Opa5, Common) {
        'use strict';

        Opa5.extendConfig({
            arrangements: new Common(),
            viewNamespace: 'i2d.qm.defect.records1.view.',
            autoWait: true,
            timeout: 100,
            testLibs: {
                fioriElementsTestLibrary: {
                    Common: {
                        appId: 'i2d.qm.defect.records1',
                        entitySet: 'C_DefectRecord'
                    }
                }
            }
        });

        sap.ui.require(
            [
                'i2d/qm/defect/records1/test/integration/ObjectPageJourney',
                'i2d/qm/defect/records1/test/integration/CustomLongTextJourney',
                'i2d/qm/defect/records1/test/integration/DefectCodeProposalJourney',
                'i2d/qm/defect/records1/test/integration/ListViewJourney'
            ],
            function () {
                QUnit.start();
            }
        );
    }
);
