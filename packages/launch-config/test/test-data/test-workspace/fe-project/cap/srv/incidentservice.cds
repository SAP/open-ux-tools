using scp.cloud from '../db/schema';
using { API_BUSINESS_PARTNER as external } from './external/API_BUSINESS_PARTNER.csn';

service IncidentService {
    //@odata.draft.enabled
    @readonly
    @Capabilities.SearchRestrictions.Searchable : false
    entity SafetyIncidents         as projection on cloud.SafetyIncidents;

    @readonly
    entity IncidentFlow            as projection on cloud.IncidentFlow;
    @readonly
    entity IncidentProcessTimeline as projection on cloud.IncidentProcessTimeline;

    @readonly
    entity Individual              as projection on cloud.Individual;

    @readonly
    entity Category                as projection on cloud.Category;

    @readonly
    entity Priority                as projection on cloud.Priority;

    @readonly entity BusinessPartner as projection on external.A_BusinessPartner {
        key BusinessPartner,
        BusinessPartnerFullName
    };
    
    @readonly entity BusinessPartnerAddress as projection on external.A_BusinessPartnerAddress {
        key BusinessPartner,
        key AddressID,
        CityName,
        Country,
        PostalCode,
        FullName,
        StreetName,
        HouseNumber
    }
}

extend scp.cloud.Individual with {
    businessPartner : Association to one external.A_BusinessPartner on businessPartner.BusinessPartner = businessPartnerID;
    businessPartnerAddress : Association to one external.A_BusinessPartnerAddress on businessPartnerAddress.BusinessPartner = businessPartnerID and businessPartnerAddress.AddressID = addressID;
}

annotate IncidentService.Individual with @(Communication.Contact : {
    fn   : businessPartner.BusinessPartnerFullName,
    adr   : [{
        type     : #work,
        code     : businessPartnerAddress.PostalCode,
        street   : businessPartnerAddress.StreetName,
        country  : businessPartnerAddress.Country,
        locality : businessPartnerAddress.CityName
    }]
});