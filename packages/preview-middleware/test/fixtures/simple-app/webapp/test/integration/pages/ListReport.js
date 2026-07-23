sap.ui.define(['sap/ui/test/Opa5', 'sap/ui/test/actions/Press', 'sap/ui/test/matchers/Properties'], function (Opa5, Press, Properties) {
    Opa5.createPageObjects({
        onTheListReport: {
            actions: {
                iPressGoButton: function () {
                    return this.waitFor({
                        controlType: 'sap.m.Button',
                        matchers: new Properties({ text: 'Go' }),
                        actions: new Press()
                    });
                }
            },
            assertions: {
                iSeeAtLeastOneResult: function () {
                    return this.waitFor({
                        controlType: 'sap.m.Text',
                        matchers: new Properties({ text: 'Product_0' }),
                        success: function () {
                            Opa5.assert.ok(true, 'Product_0 found');
                        }
                    });
                }
            }
        }
    });
});
