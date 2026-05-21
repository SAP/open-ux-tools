
--------------------------------

**TITLE**: Write OPA Tests for an SAP Fiori Elements for OData V4 Application

**INTRODUCTION**: Practical, code-focused guide to using the SAP Fiori elements for OData V4 OPA test library to write and run OPA (One Page Acceptance) tests. Covers required file locations, provided test scaffolding, typical test actions (list-report and object-page), launching tests, and where to find API documentation. Use this to implement, enhance, and run OPA journeys for Fiori Elements apps.

**TAGS**: fiori-tools, sap-fiori, opa, odata-v4, sapui5, testing, automation

**STEP**: 1 — Prerequisites & test data
**DESCRIPTION**: Required inputs and where to get sample applications and mock-data. Action: ensure you have an OData V4 service and a generated SAP Fiori elements for OData V4 app. For sample apps/mocked data, clone or copy from the sampleSolution branch and place mock JSON files under /localService/mockdata in your app.
**LANGUAGE**: text
**CODE**:
```text
Repository (sampleSolution branch):
https://github.com/SAP-samples/fiori-elements-incident-management/tree/sampleSolution

Mock data location in repo:
https://github.com/SAP-samples/fiori-elements-incident-management/tree/sampleSolution/app/incidents/webapp/localService/mockdata_RAP_service

Action:
- Copy Travel.json and Booking.json from mockdata_RAP_service to your app: /webapp/localService/mockdata/
- For static predictable tests use the copied JSON files. For dynamic mock data, start mock server (data varies).
```

**STEP**: 2 — Generated test folder and key files
**DESCRIPTION**: The app generator creates test scaffolding under /webapp/test. Understand the files used to run OPA tests and the pages folder for page objects. Action: review and modify these files to point to /test/flpSandbox.html and to add your app id when calling iStartMyApp.
**LANGUAGE**: text
**CODE**:
```text
Test folder location:
- /webapp/test
  - opaTests.qunit.html     // starts tests and loads OpaTests.qunit.js
  - OpaTests.qunit.js       // configures JourneyRunner and page objects
  - integration/FirstJourney.js
  - integration/pages/*.js  // page objects: TravelList.js, TravelObjectPage.js, BookingObjectPage.js
  - flpSandbox.html         // contains applications: mapping for iStartMyApp parameter
```

**STEP**: 3 — OpaTests.qunit.js (JourneyRunner config)
**DESCRIPTION**: Use JourneyRunner to define launchUrl and pages mapping. Action: set launchUrl to the test FLP sandbox and pass page object mappings for use by journeys.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'sap/fe/demo/travellist/test/integration/FirstJourney',
        'sap/fe/demo/travellist/test/integration/pages/TravelList',
        'sap/fe/demo/travellist/test/integration/pages/TravelObjectPage',
        'sap/fe/demo/travellist/test/integration/pages/BookingObjectPage'
    ],
    function(JourneyRunner, opaJourney, TravelList, TravelObjectPage, BookingObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('sap/fe/demo/travellist') + '/test/flpSandbox.html'
        });
    
        JourneyRunner.run(
            {
                pages: { 
                    onTheTravelList: TravelList,
                    onTheTravelObjectPage: TravelObjectPage,
                    onTheBookingObjectPage: BookingObjectPage
                }
            },
            opaJourney.run
        );
    }
);
```

**STEP**: 4 — flpSandbox.html — application mapping (identify app name for iStartMyApp)
**DESCRIPTION**: Find your application's semantic object / action name in flpSandbox.html to pass to iStartMyApp. Action: open /webapp/test/flpSandbox.html and use the application key (e.g., "travellist-tile") as parameter.
**LANGUAGE**: HTML
**CODE**:
```flpSandbox.html
...
  applications: {
			"travellist-tile": {
				title: "Travel Management",
				description: "Fiori elements",
				additionalInformation: "SAPUI5.Component=sapuidemo.travellist",
				applicationType: "URL",
				url: "../"
			}
		}
...
```

**STEP**: 5 — FirstJourney.js (example OPA journey)
**DESCRIPTION**: Example journey that starts app, checks list-report, navigates to object-page, and tears down. Action: adapt iStartMyApp parameter and extend journey with additional assertions/actions using the test library page APIs.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
sap.ui.define([
    "sap/ui/test/opaQunit"
], function (opaTest) {
    "use strict";

    var Journey = {
        run: function() {
            QUnit.module("First journey");

            opaTest("Start application", function (Given, When, Then) {
                Given.iStartMyApp("travellist-tile");
                Then.onTheTravelList.iSeeThisPage();
            });

            opaTest("Navigate to ObjectPage", function (Given, When, Then) {
                // Note: this test will fail if the ListReport page doesn't show any data
                When.onTheTravelList.onFilterBar().iExecuteSearch();
                Then.onTheTravelList.onTable().iCheckRows();

                When.onTheTravelList.onTable().iPressRow(0);
                Then.onTheTravelObjectPage.iSeeThisPage();
            });

            opaTest("Teardown", function (Given, When, Then) { 
                // Cleanup
                Given.iTearDownMyApp();
            });
        }
    }
    return Journey;
});
```

**STEP**: 6 — Page object: TravelList.js (include test library and define identifiers)
**DESCRIPTION**: Page objects wrap the reusable test library pages. Action: ensure the correct appId, componentId and entitySet are provided so test library can build stable IDs.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'sap.fe.demo.travellist',
            componentId: 'TravelList',
            entitySet: 'Travel'
        },
        CustomPageDefinitions
    );
});
```

**STEP**: 7 — JourneyRunner API reference
**DESCRIPTION**: Use JourneyRunner to control OPA5 config and to start journeys. Action: consult the SAPUI5 API when you need advanced options.
**LANGUAGE**: text
**CODE**:
```text
JourneyRunner API:
https://sapui5.hana.ondemand.com/#/api/sap.fe.test.JourneyRunner
```

**STEP**: 8 — Start tests: npm script or manual URL
**DESCRIPTION**: Launch the mock server + tests. Action: use provided npm scripts (preferred) or start server and open the OPA HTML page manually.
**LANGUAGE**: JSON / console / text
**CODE**:
```package.json
"scripts": {
  ...
  "int-test": "fiori run --config ./ui5-mock.yaml --open 'test/integration/opaTests.qunit.html'"
  ...
}
```

```console
# Preferred: run the integration test script
npm run int-test
# Alternative server commands for CAP-based apps
npm start
# or
cds watch
```

```text
# Manual open in browser (adjust port & application name):
http://localhost:<port>/<application-name>/webapp/test/integration/opaTests.qunit.html
```

**STEP**: 9 — Test library usage: simple examples and naming conventions
**DESCRIPTION**: The sap.fe.test library organizes actions/assertions by UI area. Use onFilterBar(), onTable(), onHeader(), onForm(), onFooter(), onDialog(), onShell(), etc. Naming conventions: iExecute... (press), iCheck... (assert), iChange... (change), iSelectRows / iCheckRows / iPressRow (table ops). Action: call the area accessor then the action/assertion; chain calls for readability.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// Execute search (press Go) on filter bar
When.onTheTravelList.onFilterBar().iExecuteSearch();

// Check action visibility/enablement in object-page header (identifier: service+action)
When.onTheTravelObjectPage.onHeader()
    .iCheckAction({ service: "com.c_salesordermanage_sd", action: "ChangeOrderStatus"},
                  { visible: true, enabled: false });

// Chaining example across header & footer checks
When.onTheTravelObjectPage
  .onHeader()
    .iCheckEdit({ visible: true, enabled: false })
    .and.iCheckAction({ service: "com.c_salesordermanage_sd", action: "ChangeOrderStatus"},
                      { visible: true, enabled: false })
    .and.then.iSeeFacetActionButton("OrderData", "com.c_salesordermanage_sd.FacetFormAction",
                                    { visible: true, enabled: true })
    .and.onFooter()
        .iCheckSave({ visible: true, enabled: true })
```

**STEP**: 10 — Enhance list-report tests (checks, filtering, delete & dialog)
**DESCRIPTION**: Add table row count checks, value checks, filter-setting, delete execution and dialog confirmation. Action: extend journeys using iCheckRows, iChangeFilterField, iSelectRows, iExecuteDelete, and onDialog().iConfirm().
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// Check total rows = 5
opaTest('Navigate to ObjectPage', function(Given, When, Then) {
    When.onTheTravelList.onFilterBar().iExecuteSearch();
    Then.onTheTravelList.onTable().iCheckRows(5);
});

// Check a specific column value and a combined check
...
  Then.onTheTravelList.onTable()
      .iCheckRows(5)
      .and.iCheckRows({ "Travel": "2" });
});

// Check connected description/ID pair
...
  Then.onTheTravelList.onTable()
      .iCheckRows(5)
      .and.iCheckRows({ "Travel": "2" })
      .and.iCheckRows({ "Customer": "Ryan (594)" });
});

// Filter by Status = A and expect 1 row
...
  When.onTheTravelList.onFilterBar()
      .iChangeFilterField("Status", "A")
      .and.iExecuteSearch();
  Then.onTheTravelList.onTable()
      .iCheckRows(1);
});

// Clear filter and expect 5 rows again
...
  When.onTheTravelList.onFilterBar()
      .iChangeFilterField("Status", "", true)
      .and.iExecuteSearch();
  Then.onTheTravelList.onTable().iCheckRows(5);
});

// Select a row and execute delete, confirm dialog
...
  When.onTheTravelList.onTable()
      .iSelectRows({ "Customer": "Ryan (594)" })
      .and.iExecuteDelete();
  When.onTheTravelList.onDialog().iConfirm();
});
```

**STEP**: 11 — Navigate to object-page from list-report
**DESCRIPTION**: Use iPressRow with index or condition to navigate. Action: choose row by index or condition then assert object-page loaded.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// Press by condition (Customer column)
When.onTheTravelList.onTable().iPressRow({ "Customer": "Prinz (608)" });

// Or press by zero-based index
When.onTheTravelList.onTable().iPressRow(0);
```

**STEP**: 12 — Object-page: header & form field checks
**DESCRIPTION**: Verify object-page title and header actions; check fields in forms using labels or internal identifiers. Action: use onHeader().iCheckTitle(), iCheckEdit(), onForm().iCheckField() with string labels or internal section/fieldGroup/property object identifiers.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// Header title and Edit button check
...
  Then.onTheTravelObjectPage
      .iSeeThisPage()
      .and.onHeader().iCheckTitle("Business Trip for Christine, Pierre")
      .and.iCheckEdit({ visible: true, enabled: true });
});

// Check form field by visible label and by internal names
...
  Then.onTheTravelObjectPage
      .iSeeThisPage()
      .and.onHeader().iCheckTitle("Business Trip for Christine, Pierre")
      .and.iCheckEdit({ visible: true, enabled: true })
      .and.then.onForm("General Information").iCheckField("Agency", "Hot Socks Travel (70007)")
      .and.then.onForm({ section: "GeneralInfo", fieldGroup: "Travel" }).iCheckField({ property: "AgencyID" }, { value: "70007", description: "Hot Socks Travel" });
```

**STEP**: 13 — Internal identifiers in metadata (for section/form/field)
**DESCRIPTION**: Internal names come from metadata annotations. Action: consult metadata.xml or CDS to identify IDs used as parameters for onForm() and iCheckField().
**LANGUAGE**: XML
**CODE**:
```XML
...
  <Annotations Target="SAP__self.TravelType">
  ...
    <Annotation Term="SAP__UI.Facets">
      <Collection>
        <Record Type="SAP__UI.CollectionFacet">
          <PropertyValue Property="Label" String="General Information"/>
          <PropertyValue Property="ID" String="GeneralInfo"/>                                 <!-- identifier for the section parameter -->
          <PropertyValue Property="Facets">
            <Collection>
              <Record Type="SAP__UI.ReferenceFacet">
                <PropertyValue Property="Label" String="General"/>
                <PropertyValue Property="ID" String="Travel"/>                                <!-- identifier for the form parameter -->
                <PropertyValue Property="Target" AnnotationPath="@SAP__UI.Identification"/>
              </Record>
  ...
    <Annotation Term="SAP__UI.Identification">
      <Collection>
        <Record Type="SAP__UI.DataField">
          <PropertyValue Property="Value" Path="Description"/>
        </Record>
        <Record Type="SAP__UI.DataField">
          <PropertyValue Property="Value" Path="CustomerID"/>
        </Record>
        <Record Type="SAP__UI.DataField">
          <PropertyValue Property="Value" Path="AgencyID"/>                                   <!-- identifier for the field parameter -->
        </Record>
      </Collection>
    </Annotation>
...      
```

**STEP**: 14 — Object-page: tables, sections, rows
**DESCRIPTION**: Access tables on object-pages using onTable({ property: <navProperty> }) or by table header title. Action: switch section using iGoToSection then call onTable().iCheckRows() with conditions and expected counts.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// Go to Bookings section and check Booking table rows
When.onTheTravelObjectPage.iGoToSection("Bookings");
Then.onTheTravelObjectPage.onTable({ property: "_Booking" }).iCheckRows({ "Airline": "Sunset Wings (SW)"}, 4);
```

**STEP**: 15 — Object-page: edit field, save, and verify message
**DESCRIPTION**: Walk through edit/save workflow: navigate to section, execute edit, change a field in the form, save via footer, verify toast message, and assert changed value. Action: use iExecuteEdit, iChangeField, iExecuteSave, Then.iSeeMessageToast, and iCheckField.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
When.onTheTravelObjectPage.iGoToSection("General Information");
When.onTheTravelObjectPage.onHeader().iExecuteEdit();
When.onTheTravelObjectPage.onForm({ section: "GeneralInfo", fieldGroup: "Dates" }).iChangeField({ property: "EndDate" }, "Aug 31, 2021");
When.onTheTravelObjectPage.onFooter().iExecuteSave();
Then.iSeeMessageToast("Object saved.");
Then.onTheTravelObjectPage.onForm({ section: "GeneralInfo", fieldGroup: "Dates" }).iCheckField({ property: "EndDate" }, { value: "Aug 31, 2021" });
```

**STEP**: 16 — Navigate back to list-report
**DESCRIPTION**: Use shell back navigation only when app launched via FLP sandbox (flpSandbox.html). Action: call onTheShell.iNavigateBack() then verify list-report page.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
When.onTheShell.iNavigateBack();
Then.onTheTravelList.iSeeThisPage();
```

**STEP**: 17 — Further references
**DESCRIPTION**: Where to find the full API for available test functions (ListReport, ObjectPage, TemplatePage, FilterBar, Table, Dialog, Form, Header, Footer, Shell).
**LANGUAGE**: text
**CODE**:
```text
SAPUI5 API Reference (sap.fe.test):
https://sapui5.hana.ondemand.com/#/api
- Look under namespace: sap.fe.test
- Inspect folders: /api -> /ListReport, /ObjectPage, /TemplatePage
```

Notes:
- Keep mock server state consistent for repeatable tests (use static mock json files).
- When deleting or changing mock data during a journey, restart the server to restore mock-data.
- Use page object identifiers (appId, componentId, entitySet, section IDs) to enable stable control identification.
--------------------------------
