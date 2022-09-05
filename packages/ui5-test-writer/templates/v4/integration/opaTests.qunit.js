sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        '<%- appPath %>/test/integration/<%- opaJourneyFileName %>',
<%- pages.map((page) => {return "\t\t'" + page.appPath + '/test/integration/pages/' + page.targetKey + "'";}).join(',\n')%>
    ],
    function(JourneyRunner, opaJourney, <%- pages.map(function(page) {return page.targetKey;}).join(', ')%>) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('<%- appPath %>') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
<%- pages.map((page) => {return '\t\t\t\t\tonThe' + page.targetKey + ': ' + page.targetKey}).join(',\n')%>
                }
            },
            opaJourney.run
        );
    }
);