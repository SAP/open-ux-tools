sap.ui.define(
    ['sap/ui/test/opaQunit', 'sap/ui/test/Opa5', 'test/fe/v2/app/test/integration/pages/ListReport'],
    function (opaTest, Opa5) {
        QUnit.module('List Report');

        opaTest('Should load the list report and find results', function (Given, When, Then) {
            Given.iStartMyUIComponent({ componentConfig: { name: 'test.fe.v2.app', async: true }, autoWait: true, timeout: 80 });
            When.onTheListReport.iPressGoButton();
            Then.onTheListReport.iSeeAtLeastOneResult();
            Then.iTeardownMyApp();
        });
    }
);
