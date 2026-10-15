sap.ui.define(['sap/ui/test/opaQunit', 'sap/ui/test/Opa5'], function (opaTest, Opa5) {
    'use strict';

    QUnit.module('Object Page Journey');

    Opa5.extendConfig({
        appParams: {
            'sap-ui-animation': false
        }
    });

    opaTest('Should be able to navigate to detail page', function (Given, When, Then) {
        Given.iStartTheAppAction();
        //		Not required any more as the search is executed by default
        When.onTheGenericListReport
            .iExecuteTheSearch()
            .and //		When.onTheGenericListReport
            .iLookAtTheScreen()
            .and.iNavigateFromListItemByFieldValue({ 'Field': 'Defect', 'Value': '372' });

        //When.onTheGenericObjectPage.iClickTheButtonWithId("i2d.qm.sample.objectpages1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_Materialsampleobjpage--action::SampleObjectEditButton");
        // Dummy check for title! Instead implement check for "sap.m.MessageToast"!? 21
        //Then.onTheGenericObjectPage.iShouldSeeTheButtonWithId("action::ActionSetInProcess").and.iTeardownMyAppFrame();
        //Then.onTheGenericObjectPage.iShouldSeeTheButtonWithId("edit")
        Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect('372').and.iTeardownMyAppFrame();
    });

    opaTest('Should be able to see the -Tasks- Section', function (Given, When, Then) {
        Given.iStartTheAppAction();
        //		Not required any more as the search is executed by default
        When.onTheGenericListReport
            .iExecuteTheSearch()
            .and //		When.onTheGenericListReport
            .iLookAtTheScreen()
            .and.iNavigateFromListItemByFieldValue({ 'Field': 'Defect', 'Value': '372' });

        Then.onTheGenericObjectPage.iShouldSeeTheSections(['Tasks']).and.iTeardownMyAppFrame();
    });

    opaTest('Should be able to see the action -Complete-', function (Given, When, Then) {
        Given.iStartTheAppAction();
        //		Not required any more as the search is executed by default
        When.onTheGenericListReport
            .iExecuteTheSearch()
            .and //		When.onTheGenericListReport
            .iLookAtTheScreen()
            .and.iNavigateFromListItemByFieldValue({ 'Field': 'Defect', 'Value': '372' });

        var vActionComplete = 'action::QM_DEFECT_RECORD_SRV.QM_DEFECT_RECORD_SRV_Entities::C_DefectRecordComplete';
        Then.onTheGenericObjectPage.iShouldSeeTheButtonWithId(vActionComplete).and.iTeardownMyAppFrame();
    });

    opaTest('Should be able to trigger the action -Complete-', function (Given, When, Then) {
        Given.iStartTheAppAction({
            hash: "/C_DefectRecord(DefectInternalID='%252400000000372',DraftUUID=guid'00000000-0000-0000-0000-000000000000',IsActiveEntity=true)"
        });
        //When.
        Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect('372');

        var vActionComplete = 'action::QM_DEFECT_RECORD_SRV.QM_DEFECT_RECORD_SRV_Entities::C_DefectRecordComplete';
        When.onTheGenericObjectPage.iClickTheButtonWithId(vActionComplete);

        Then.onTheGenericObjectPage
            .theObjectPageDataFieldHasTheCorrectValue({ Field: 'DefectLifecycleStatus', Value: '20' })
            .and.iTeardownMyAppFrame();
    });

    opaTest('Should be able to navigate to a task from the tasks table', function (Given, When, Then) {
        Given.iStartTheAppAction({
            hash: "/C_DefectRecord(DefectInternalID='%252400000000372',DraftUUID=guid'00000000-0000-0000-0000-000000000000',IsActiveEntity=true)"
        });
        Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect('372');

        When.onTheGenericObjectPage.iNavigateFromObjectPageTableByLineNo('', 0, '', 'DefectDataFacet2');

        Then.iTeardownMyAppFrame();
    });

    /*	
	opaTest("Should see the action to add tasks when in edit mode" , function(Given, When, Then) {
		Given.iStartTheAppAction( { hash : "/C_DefectRecord(DefectInternalID='%252400000000373',DraftUUID=guid'10000000-1000-1000-1000-100000000000',IsActiveEntity=false)" } ); 
		Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect("373");
		Then.onTheGenericObjectPage.iShouldSeeTheButtonWithId("ActionCreateTask").and.iTeardownMyAppFrame();
	});
	
	opaTest("Should not be able to navigate to the task object page to create new task" , function(Given, When, Then) {
		/* the action to create a new task is a navigation to the Process Task app. however, navigation cannot not be tested sucessfully in OPA5, since the target is
			is not there --> we only test the negative test case.
		*/
    /*		Given.iStartTheAppAction( { hash : "/C_DefectRecord(DefectInternalID='%252400000000373',DraftUUID=guid'10000000-1000-1000-1000-100000000000',IsActiveEntity=false)" } ); 
		Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect("373");
		Then.onTheGenericObjectPage.iShouldSeeTheButtonWithId("ActionCreateTask");
		
		When.onTheGenericObjectPage.iClickTheButtonWithId("ActionCreateTask");
		Then.onTheGenericObjectPage.iShouldSeeTheDialogWithTitle("Error").and.iTeardownMyAppFrame();
	});

		
	opaTest("Should not be able to navigate to the task object page to edit an existing task" , function(Given, When, Then) {
		/* the action to edit a task is a navigation to the Process Task app. however, navigation cannot not be tested sucessfully in OPA5, since the target is
			is not there --> we only test the negative test case.
		*/
    /*		Given.iStartTheAppAction( { hash : "/C_DefectRecord(DefectInternalID='%252400000000374',DraftUUID=guid'10000000-1000-1000-1000-100000000000',IsActiveEntity=false)" } ); 
		
		Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect("374");
		
		Then.onTheObjectPage.iShouldSeeTheEditButtonInTaskTable();
		
		When.onTheGenericObjectPage.iClickTheButtonWithIcon("sap-icon://edit");
		
		Then.onTheGenericObjectPage.iShouldSeeTheDialogWithTitle("Error");
		Then.onTheGenericObjectPage.iTeardownMyAppFrame();
	});
	
	opaTest("Should not be able to navigate to the task object page to display an existing task" , function(Given, When, Then) {
		/* the action to display a task is a navigation to the Process Task app. however, navigation cannot not be tested sucessfully in OPA5, since the target is
			is not there --> we only test the negative test case.
		*/
    /*		Given.iStartTheAppAction( { hash : "/C_DefectRecord(DefectInternalID='%252400000000372',DraftUUID=guid'00000000-0000-0000-0000-000000000000',IsActiveEntity=true)" } ); 
		
		Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect("372");
		
		Then.onTheObjectPage.iShouldSeeTheChevronInTaskTable();
		
		When.onTheGenericObjectPage.iNavigateFromObjectPageTableByLineNo("", 0, "", "DefectDataFacet2");
		
		Then.onTheGenericObjectPage.iShouldSeeTheDialogWithTitle("Error");
		Then.onTheGenericObjectPage.iTeardownMyAppFrame();
	});
*/
    opaTest('Should be able to see the processor notes popover', function (Given, When, Then) {
        Given.iStartTheAppAction({
            hash: "/C_DefectRecord(DefectInternalID='%252400000000374',DraftUUID=guid'10000000-1000-1000-1000-100000000000',IsActiveEntity=false)"
        });

        Then.onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect('374');
        When.onTheGenericObjectPage.iClickTheLink('test test test test');
        Then.onTheGenericObjectPage.iShouldSeeThePopoverWithTitle('Processor Notes');
        Then.onTheGenericObjectPage.iTeardownMyAppFrame();
    });
});
