QUnit.config.autostart = false;
QUnit.config.testTimeout = 150000;
var oUriParameters = new URLSearchParams(window.location.search);
var sJourney = oUriParameters.get("journey");
var sPrerequisiteModules = [
    "sap/fe/test/JourneyRunner"
];

sap.ui.require(sPrerequisiteModules, function (JourneyRunnerClass) {
    fetch("AllJourneys.json").then(function (oResponse) {
        if (!oResponse.ok) {
            throw new Error("Failed to load AllJourneys.json: " + oResponse.status + " " + oResponse.statusText);
        }
        return oResponse.json();
    }).then(function (aAllJourneys) {
        var adpNs = "<%- app.id.split('.').join('/') %>";
        var aJourneys = aAllJourneys.filter(function (name) {
            return !sJourney || sJourney === name;
        }).map(function (name) {
            return adpNs + "/test/integration/" + name;
        });

        sap.ui.require(aJourneys, function () {
            var aJourneyModules = Array.prototype.slice.call(arguments);
            var testPath = adpNs + "/test"; 
            var sLaunchUrl = oUriParameters.get("env") === "karma"
                ? sap.ui.require.toUrl(testPath) + "/flpSandbox.html?sap-ui-xx-viewCache=false#<FLP_INTENT>"
                : sap.ui.require.toUrl(testPath) + "/flp.html?sap-ui-xx-viewCache=false#app-preview";

            var JourneyRunner = new JourneyRunnerClass({
                launchUrl: sLaunchUrl
            });

            JourneyRunner.run(
                {
                    pages: {}
                },
                aJourneyModules.map(function (oJourney) { return oJourney.run; })
            );
            QUnit.start();
        });
    });
});
