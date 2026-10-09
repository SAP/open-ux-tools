/*
 * Copyright (C) 2009-2014 SAP SE or an SAP affiliate company. All rights reserved
 */
jQuery.sap.declare('cross.fnd.fiori.inbox.model.mockRequests');
jQuery.sap.registerModulePath('cross.fnd.fiori.inbox', './');
jQuery.sap.require('cross.fnd.fiori.inbox.model.MyInboxMockServerData');
cross.fnd.fiori.inbox.model.mockRequests = {};
cross.fnd.fiori.inbox.model.mockRequests.getRequests = function () {
    return [cross.fnd.fiori.inbox.model.mockRequests.mockDecisionOptionFuntionImport()];
};
cross.fnd.fiori.inbox.model.mockRequests.mockDecisionOptionFuntionImport = function () {
    var s = cross.fnd.fiori.inbox.model.MyInboxMockServerData;
    return {
        method: 'GET',
        path: new RegExp('(DecisionOptions)/?(.*)?'),
        response: function (x) {
            x.respondJSON(200, '', JSON.stringify(s.decisionOptionsData));
            jQuery.sap.log.debug('MockServer: response sent with 200, ' + JSON.stringify(s.decisionOptionsData));
        }
    };
};
