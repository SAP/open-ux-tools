sap.ui.require(
    [
       '<%- appPath %>/test/integration/<%- opaJourneyFileName %>'
    ],
    function () {
        "use strict";
        
        QUnit.start();
});