sap.ui.define(['sap/ui/test/opaQunit'], function (opaTest) {
    'use strict';

    QUnit.module('ListView');

    opaTest('#1 I should see the Defect 375 in the result because IsDeleted = false', function (Given, When, Then) {
        //Given
        Given.iStartTheAppAction();

        //When
        When.onTheGenericListReport
            .iSetTheFilter({ Field: 'Defect', Value: '375' })
            .and.iExecuteTheSearch()
            .and.iLookAtTheScreen();

        //Then
        Then.onTheGenericListReport
            .theResultListIsVisible()
            .and.theResultListContainsTheCorrectNumberOfItems(1)
            .and.theResultListFieldHasTheCorrectValue({ Line: 0, Field: 'Defect', Value: '375' })
            .and.iTeardownMyAppFrame();
    });

    opaTest('#2 I should not see the Defect 376 in the result because IsDeleted = true', function (Given, When, Then) {
        //Given
        Given.iStartTheAppAction();

        //When
        When.onTheGenericListReport
            .iSetTheFilter({ Field: 'Defect', Value: '376' })
            .and.iExecuteTheSearch()
            .and.iLookAtTheScreen();

        //Then
        Then.onTheGenericListReport
            .theResultListIsVisible()
            .and.theResultListContainsTheCorrectNumberOfItems(0)
            .and.iTeardownMyAppFrame();
    });
});
