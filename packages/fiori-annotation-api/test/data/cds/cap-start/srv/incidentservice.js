const cds = require("@sap/cds");

module.exports = cds.service.impl(async function (srv) {
    const {
        Incidents
    } = srv.entities

    //read/edit event hook after read  of entity 'Incidents'
    srv.after("READ", "Incidents", setPriorityCriticality);

    /**
     * Set priority criticality used for display in LR table
     *
     * @param Incidents {Incidents | Incidents[]}  (Array of) Incidents
     */
    function setPriorityCriticality(Incidents) {

        function _setCriticality(Incidents) {
            if (Incidents.priority) {
                Incidents.priority.criticality = parseInt(Incidents.priority.code);
            }
        }

        if (Array.isArray(Incidents)) {
            Incidents.forEach(_setCriticality);
        } else {
            _setCriticality(Incidents);
        }
    }
})