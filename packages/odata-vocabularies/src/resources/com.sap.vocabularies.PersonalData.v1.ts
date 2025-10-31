// Last content update: Wed Oct 15 2025 09:21:20 GMT+0200 (Central European Summer Time)
import type { CSDL } from '@sap-ux/vocabularies/CSDL';

export default {
    '$Version': '4.0',
    '$Reference': {
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Core.V1',
                    '$Alias': 'Core'
                }
            ]
        },
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Validation.V1',
                    '$Alias': 'Validation'
                }
            ]
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/Common.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.Common.v1',
                    '$Alias': 'Common'
                }
            ]
        }
    },
    'com.sap.vocabularies.PersonalData.v1': {
        '$Alias': 'PersonalData',
        '@Org.OData.Core.V1.Description': 'Terms for annotating Personal Data',
        '@Org.OData.Core.V1.Description#Published': '2018-01-24 © Copyright 2018 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/PersonalData.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/PersonalData.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/PersonalData.md'
            }
        ],
        '@Org.OData.Core.V1.LongDescription':
            '\n## Definition\n\nPersonal Data is any information relating to an identified or identifiable natural person ("data subject"). \n\nAn identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier, or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural, or social identity of that natural person.\n\nPersonal data can only be processed under certain legal grounds, e.g. explicit consent of the data subject or a contractual obligation.\n\nThis vocabulary defines terms specific to the European [General Data Protection Regulation (GDPR)](https://ec.europa.eu/info/law/law-topic/data-protection_en).\n\nTerms for contact and address information are defined in the [Communication vocabulary](Communication.md#).\n\n### References\n- [European Commission: Reform of EU data protection rules](https://ec.europa.eu/info/law/law-topic/data-protection/reform_en)\n- [European Commission: Rules for business and organisations](https://ec.europa.eu/info/law/law-topic/data-protection/reform/rules-business-and-organisations_en)\n- [European Commission: Legal grounds for processing data](https://ec.europa.eu/info/law/law-topic/data-protection/reform/rules-business-and-organisations/legal-grounds-processing-data_en).\n       ',
        'EntitySemantics': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.PersonalData.v1.EntitySemanticsType',
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description': 'Primary meaning of the entities in the annotated entity set'
        },
        'DataSubjectRole': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description': 'Role of the data subjects in this set (e.g. employee, customer)',
            '@Org.OData.Core.V1.LongDescription':
                'Values are application-specific.\n          Can be a static value or a `Path` expression If the role varies per entity'
        },
        'DataSubjectRoleDescription': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.IsLanguageDependent': true,
            '@Org.OData.Core.V1.Description':
                'Language-dependent description of the role of the data subjects in this set (e.g. employee, customer)',
            '@Org.OData.Core.V1.LongDescription':
                'Values are application-specific.\n          Can be a static value or a `Path` expression If the role varies per entity'
        },
        'EntitySemanticsType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'Primary meaning of the data contained in the annotated entity set',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'DataSubject',
                    '@Org.OData.Core.V1.Description':
                        'Entities describing a data subject (an identified or identifiable natural person), e.g. customer, vendor, employee',
                    '@Org.OData.Core.V1.LongDescription':
                        'These entities are relevant for audit logging. There are no restrictions on their structure. The properties should be annotated suitably with [FieldSemantics](#FieldSemantics).'
                },
                {
                    'Value': 'DataSubjectDetails',
                    '@Org.OData.Core.V1.Description':
                        'Entities containing details to a data subject (an identified or identifiable natural person) but not representing data subjects by themselves, e.g. street addresses, email addresses, phone numbers',
                    '@Org.OData.Core.V1.LongDescription':
                        'These entities are relevant for audit logging. There are no restrictions on their structure. The properties should be annotated suitably with [FieldSemantics](#FieldSemantics).'
                },
                {
                    'Value': 'Other',
                    '@Org.OData.Core.V1.Description':
                        'Entities containing personal data or references to data subjects but not representing data subjects or data subject details by themselves, e.g. customer quote, customer order, purchase order with involved business partners',
                    '@Org.OData.Core.V1.LongDescription':
                        'These entities are relevant for audit logging. There are no restrictions on their structure. The properties should be annotated suitably with [FieldSemantics](#FieldSemantics).'
                }
            ]
        },
        'FieldSemantics': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.PersonalData.v1.FieldSemanticsType',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Primary meaning of the personal data contained in the annotated property',
            '@Org.OData.Core.V1.LongDescription':
                'Changes to values of annotated properties are tracked in the audit log. Use this annotation also on fields that are already marked as contact or address data.'
        },
        'FieldSemanticsType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'Primary meaning of a data field',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'DataSubjectID',
                    '@Org.OData.Core.V1.Description': 'The unique identifier for a data subject'
                },
                {
                    '@com.sap.vocabularies.Common.v1.Experimental': true,
                    'Value': 'DataSubjectIDType',
                    '@Org.OData.Core.V1.Description':
                        'The type of ID identifying the data subject and which is allocated when creating a consent record, e.g. an e-mail address or a phone number.'
                },
                {
                    '@com.sap.vocabularies.Common.v1.Experimental': true,
                    'Value': 'ConsentID',
                    '@Org.OData.Core.V1.Description': 'The unique identifier for a consent',
                    '@Org.OData.Core.V1.LongDescription':
                        'A consent is the action of the data subject confirming that \n                the usage of his or her personal data shall be allowed for a given purpose. \n                A consent functionality allows the storage of a consent record in relation \n                to a specific purpose and shows if a data subject has granted, withdrawn, \n                or denied consent.'
                },
                {
                    '@com.sap.vocabularies.Common.v1.Experimental': true,
                    'Value': 'PurposeID',
                    '@Org.OData.Core.V1.Description':
                        'The unique identifier for the purpose of a processing of personal data',
                    '@Org.OData.Core.V1.LongDescription':
                        'Any processing of personal data is based on specified, explicit, and legitimate purposes, and data are not further processed in a manner that is incompatible with those purposes. The purposes are defined by the data controller or joint data controllers.\n                '
                },
                {
                    'Value': 'ContractRelatedID',
                    '@Org.OData.Core.V1.Description':
                        'The unique identifier for transactional data that is related to a contract that requires processing of personal data',
                    '@Org.OData.Core.V1.LongDescription':
                        'Examples:\n\n                - Sales Contract ID\n\n                - Purchase Contract ID\n\n                - Service Contract ID\n                '
                },
                {
                    'Value': 'LegalEntityID',
                    '@Org.OData.Core.V1.Description': 'The unique identifier of a legal entity',
                    '@Org.OData.Core.V1.LongDescription':
                        'A legal entity is a corporation, an association, or any other organization of legal capacity, which has statutory rights and responsibilities.',
                    '@Org.OData.Core.V1.Revisions': [
                        {
                            'Kind': 'Deprecated',
                            'Description': 'Deprecated in favor of [`DataControllerID`](#DataControllerID)'
                        }
                    ]
                },
                {
                    '@com.sap.vocabularies.Common.v1.Experimental': true,
                    'Value': 'UserID',
                    '@Org.OData.Core.V1.Description': 'The unique identifier of a user',
                    '@Org.OData.Core.V1.LongDescription':
                        'A user is an individual who interacts with the services supplied by a system.'
                },
                {
                    '@com.sap.vocabularies.Common.v1.Experimental': true,
                    'Value': 'EndOfBusinessDate',
                    '@Org.OData.Core.V1.Description':
                        'Defines the end of active business and the start of residence time and retention period',
                    '@Org.OData.Core.V1.LongDescription':
                        'End of business is the point in time when the processing of a set of personal data is no longer required for the active business,\n                for example, when a contract is fulfilled. After this has been reached and a customer-defined residence period has passed, the data is blocked and can only be accessed\n                by users with special authorizations (for example, tax auditors).\n                All fields of type `Edm.Date` or `Edm.DateTimeOffset` on which the end of business determination depends should be annotated.'
                },
                {
                    '@com.sap.vocabularies.Common.v1.Experimental': true,
                    'Value': 'DataControllerID',
                    '@Org.OData.Core.V1.Description': 'The unique identifier of a data controller',
                    '@Org.OData.Core.V1.LongDescription':
                        'The unique identifier of a legal entity which alone or jointly with others determines the purposes and means of the processing of personal data. \n                The Data Controller is fully responsible (and accountable) that data protection and privacy principles (such as purpose limitation or data minimization), defined in the European General Data Protection Regulation (GDPR) or any other data protection legislation, are adhered to when processing personal data. The DataControllerID succeeds the LegalEntityID.'
                },
                {
                    '@com.sap.vocabularies.Common.v1.Experimental': true,
                    'Value': 'BlockingDate',
                    '@Org.OData.Core.V1.Description':
                        'Defines a date that marks when the provider of the data will block these',
                    '@Org.OData.Core.V1.LongDescription':
                        'Defines a date that marks when the provider of the data will block these. This is the point in time when the processing of a set of personal data is no longer required for the active business, for example, when a contract is fulfilled. After it has been reached, the data is blocked in the source and can only be displayed by users with special authorizations (for example, tax auditors); however, it is not allowed to create/change/copy/follow-up blocked data. Consumers of the data should consider if there is an additional purpose to process the data beyond the defined blocking date.'
                },
                {
                    '@com.sap.vocabularies.Common.v1.Experimental': true,
                    'Value': 'EndOfRetentionDate',
                    '@Org.OData.Core.V1.Description': 'Defines the date when the provider destroys the data',
                    '@Org.OData.Core.V1.LongDescription':
                        'Defines a date that marks when the provider of the data can destroy these. Consumers of the data should consider if there is an additional purpose (or a legal hold) to process the data beyond the defined destruction date.'
                }
            ]
        },
        'IsPotentiallyPersonal': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'Property contains potentially personal data',
            '@Org.OData.Core.V1.LongDescription':
                'Personal data describes any information which is related to an identified or identifiable natural person (data subject). An identifiable person is one who can be identified, directly or indirectly, in particular by a reference to an identifier such as a name, an identification number, location data, an online identifier, or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural, or social identity of that natural person. Note: properties annotated with [`FieldSemantics`](#FieldSemantics) need not be additionally annotated with this term.\n          '
        },
        'IsPotentiallySensitive': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'Property contains potentially sensitive personal data',
            '@Org.OData.Core.V1.LongDescription':
                'Sensitive personal data is a category of personal data that needs special handling. The determination which personal data is sensitive may differ for different legal areas or industries. Examples of sensitive personal data:\n                      - Special categories of personal data, such as data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data, data concerning health or sex life or sexual orientation.\n                      - Personal data subject to professional secrecy. \n                      - Personal data relating to criminal or administrative offences.\n                      - Personal data concerning insurances and bank or credit card accounts.\n          '
        }
    }
} as CSDL;
