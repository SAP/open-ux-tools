using { sap.ui.lcnc as my } from '../db/schema';

@path: 'service'
service MainService {
  entity Capex 
    @(restrict : [
            {
                grant : [ 'READ' ],
                to : [ 'CapexRead' ]
            },
            {
                grant : [ '*' ],
                to : [ 'CapexWrite' ]
            }
    ])
    as projection on my.Capex;
    annotate Capex with @odata.draft.enabled; 
  entity CapexType 
    @(restrict : [
            {
                grant : [ 'READ' ],
                to : [ 'CapexRead' ]
            },
            {
                grant : [ '*' ],
                to : [ 'CapexWrite' ]
            }
    ])
    as projection on my.CapexType;
  entity BusinessUnits 
    @(restrict : [
            {
                grant : [ 'READ' ],
                to : [ 'CapexRead' ]
            },
            {
                grant : [ '*' ],
                to : [ 'CapexWrite' ]
            }
    ])
    as projection on my.BusinessUnits;
    entity Consultants 
    @(restrict : [
            {
                grant : [ 'READ' ],
                to : [ 'CapexRead' ]
            },
            {
                grant : [ '*' ],
                to : [ 'CapexWrite' ]
            }
    ])
    as projection on my.Consultants;
}