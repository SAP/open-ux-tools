sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        '<%- appPath %>/test/integration/Firstjourney',
<%- pages.map((page) => {return "\t\t'" + page.appPath + '/test/integration/pages/' + page.name + "'";}).join(',\n')%>
    ],
    function(JourneyRunner, Firstjourney, <%- pages.map(function(page) {return page.name;}).join(', ')%>) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('<%- appPath %>') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
<%- pages.map((page) => {return '\t\t\t\t\tonThe' + page.name + ': ' + page.name}).join(',\n')%>
                }
            },
            Firstjourney.run
        );
    }
);