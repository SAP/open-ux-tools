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
        }
    },
    'com.sap.vocabularies.Communication.v1': {
        '$Alias': 'Communication',
        '@Org.OData.Core.V1.Description': 'Terms for annotating communication-relevant information',
        '@Org.OData.Core.V1.LongDescription':
            '\nThese terms are inspired by\n- RFC6350 vCard (http://tools.ietf.org/html/rfc6350)\n- RFC5545 iCalendar (http://tools.ietf.org/html/rfc5545)\n- RFC5322 Internet Message Format (http://tools.ietf.org/html/rfc5322)\n- RFC6351 xCard: vCard XML Representation (https://tools.ietf.org/html/rfc6351)\n        ',
        '@Org.OData.Core.V1.Description#Published': '2017-02-15 © Copyright 2013 SAP AG. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Communication.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Communication.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Communication.md'
            }
        ],
        'Contact': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Communication.v1.ContactType',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Address book entry'
        },
        'ContactType': {
            '$Kind': 'ComplexType',
            'fn': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Full name'
            },
            'n': {
                '$Type': 'com.sap.vocabularies.Communication.v1.NameType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Name'
            },
            'nickname': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Nickname'
            },
            'photo': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Image or photograph',
                '@Org.OData.Core.V1.IsURL': true
            },
            'bday': {
                '$Type': 'Edm.Date',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Birthday'
            },
            'anniversary': {
                '$Type': 'Edm.Date',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Date of marriage, or equivalent'
            },
            'gender': {
                '$Type': 'com.sap.vocabularies.Communication.v1.GenderType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Sex and gender identity'
            },
            'title': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Position or job title'
            },
            'role': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Function or part played in a particular situation'
            },
            'org': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Organization Name defined by X.520'
            },
            'orgunit': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Organization Unit defined by X.520'
            },
            'kind': {
                '$Type': 'com.sap.vocabularies.Communication.v1.KindType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Kind of contact'
            },
            'note': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Supplemental information or a comment associated with the contact'
            },
            'adr': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Communication.v1.AddressType',
                '@Org.OData.Core.V1.Description': 'Addresses'
            },
            'tel': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Communication.v1.PhoneNumberType',
                '@Org.OData.Core.V1.Description': 'Phone numbers'
            },
            'email': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Communication.v1.EmailAddressType',
                '@Org.OData.Core.V1.Description': 'Email addresses'
            },
            'geo': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Communication.v1.GeoDataType',
                '@Org.OData.Core.V1.Description': 'Geographic locations'
            },
            'url': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Communication.v1.UrlType',
                '@Org.OData.Core.V1.Description': 'URLs'
            }
        },
        'NameType': {
            '$Kind': 'ComplexType',
            'surname': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Surname or family name'
            },
            'given': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Given name'
            },
            'additional': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Additional names'
            },
            'prefix': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Honorific prefix(es)'
            },
            'suffix': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Honorific suffix(es)'
            }
        },
        'Address': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Communication.v1.AddressType',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Address'
        },
        'AddressType': {
            '$Kind': 'ComplexType',
            'building': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Building identifier'
            },
            'street': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Street address'
            },
            'district': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Territorial administrative organization in a large city'
            },
            'locality': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'City or similar'
            },
            'region': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'State, province, or similar'
            },
            'code': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Postal code'
            },
            'country': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Country name',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'pobox': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Post office box'
            },
            'ext': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Extended address (e.g., apartment or suite number)'
            },
            'careof': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'An intermediary who is responsible for transferring a piece of mail between the postal system and the final addressee'
            },
            'label': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Delivery address label; plain-text string representing the formatted address, may contain line breaks'
            },
            'type': {
                '$Type': 'com.sap.vocabularies.Communication.v1.ContactInformationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Address type'
            }
        },
        'PhoneNumberType': {
            '$Kind': 'ComplexType',
            'uri': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'This SHOULD use the tel: URL schema defined in RFC3966',
                '@Org.OData.Core.V1.IsURL': true
            },
            'type': {
                '$Type': 'com.sap.vocabularies.Communication.v1.PhoneType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Telephone type'
            }
        },
        'EmailAddressType': {
            '$Kind': 'ComplexType',
            'address': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Email address'
            },
            'type': {
                '$Type': 'com.sap.vocabularies.Communication.v1.ContactInformationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Address type'
            }
        },
        'GeoDataType': {
            '$Kind': 'ComplexType',
            'uri': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'This SHOULD use the geo: URL schema defined in RFC5870 which encodes the same information as an Edm.GeographyPoint',
                '@Org.OData.Core.V1.IsURL': true
            },
            'type': {
                '$Type': 'com.sap.vocabularies.Communication.v1.ContactInformationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Address type'
            }
        },
        'UrlType': {
            '$Kind': 'ComplexType',
            'uri': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'This MUST use the URL schema defined in RFC3986',
                '@Org.OData.Core.V1.IsURL': true
            },
            'type': {
                '$Type': 'com.sap.vocabularies.Communication.v1.ContactInformationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'URL type'
            }
        },
        'KindType': {
            '$Kind': 'EnumType',
            'individual': 0,
            'individual@Org.OData.Core.V1.Description': 'A single person or entity',
            'group': 1,
            'group@Org.OData.Core.V1.Description': 'A group of persons or entities',
            'org': 2,
            'org@Org.OData.Core.V1.Description': 'An organization',
            'location': 3,
            'location@Org.OData.Core.V1.Description': 'A named geographical place'
        },
        'ContactInformationType': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'work': 1,
            'work@Org.OData.Core.V1.Description': "Related to an individual's work place",
            'home': 2,
            'home@Org.OData.Core.V1.Description': "Related to an indivdual's personal life",
            'preferred': 4,
            'preferred@Org.OData.Core.V1.Description': 'Preferred-use contact information'
        },
        'PhoneType': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'work': 1,
            'work@Org.OData.Core.V1.Description': 'Work telephone number',
            'home': 2,
            'home@Org.OData.Core.V1.Description': 'Private telephone number',
            'preferred': 4,
            'preferred@Org.OData.Core.V1.Description': 'Preferred-use telephone number',
            'voice': 8,
            'voice@Org.OData.Core.V1.Description': 'Voice telephone number',
            'cell': 16,
            'cell@Org.OData.Core.V1.Description': 'Cellular or mobile telephone number',
            'fax': 32,
            'fax@Org.OData.Core.V1.Description': 'Facsimile telephone number',
            'video': 64,
            'video@Org.OData.Core.V1.Description': 'Video conferencing telephone number'
        },
        'GenderType': {
            '$Kind': 'EnumType',
            'M': 0,
            'M@Org.OData.Core.V1.Description': 'male',
            'F': 1,
            'F@Org.OData.Core.V1.Description': 'female',
            'O': 2,
            'O@Org.OData.Core.V1.Description': 'other',
            'N': 3,
            'N@Org.OData.Core.V1.Description': 'not applicable',
            'U': 4,
            'U@Org.OData.Core.V1.Description': 'unknown'
        },
        'IsEmailAddress': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'Property contains an email address'
        },
        'IsPhoneNumber': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'Property contains a phone number'
        },
        'Event': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Communication.v1.EventData',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Calendar entry'
        },
        'EventData': {
            '$Kind': 'ComplexType',
            'summary': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Short description of the event'
            },
            'description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'More complete description'
            },
            'categories': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description': 'Categories or subtypes of the event'
            },
            'dtstart': {
                '$Type': 'Edm.DateTimeOffset',
                '$Nullable': true,
                '$Precision': 0,
                '@Org.OData.Core.V1.Description': 'Start date and time of the event'
            },
            'dtend': {
                '$Type': 'Edm.DateTimeOffset',
                '$Nullable': true,
                '$Precision': 0,
                '@Org.OData.Core.V1.Description': 'Date and time by which the event ends, alternative to duration'
            },
            'duration': {
                '$Type': 'Edm.Duration',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Duration of the event, alternative to dtend'
            },
            'class': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Access classification, e.g. PUBLIC, PRIVATE, CONFIDENTIAL'
            },
            'status': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Confirmation status, e.g. CONFIRMED, TENTATIVE, CANCELLED'
            },
            'location': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Intended venue of the event'
            },
            'transp': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Time transparency for busy time searches, true = free, false = blocked'
            },
            'wholeday': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Wholeday event'
            },
            'fbtype': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Free or busy time type, e.g. FREE, BUSY, BUSY-TENTATIVE'
            }
        },
        'Task': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Communication.v1.TaskData',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Task list entry'
        },
        'TaskData': {
            '$Kind': 'ComplexType',
            'summary': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Short description of the task'
            },
            'description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'More complete description of the task'
            },
            'due': {
                '$Type': 'Edm.DateTimeOffset',
                '$Nullable': true,
                '$Precision': 0,
                '@Org.OData.Core.V1.Description': 'Date and time that a to-do is expected to be completed'
            },
            'completed': {
                '$Type': 'Edm.DateTimeOffset',
                '$Nullable': true,
                '$Precision': 0,
                '@Org.OData.Core.V1.Description': 'Date and time that a to-do was actually completed'
            },
            'percentcomplete': {
                '$Type': 'Edm.Byte',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Percent completion of a to-do, e.g. 50 for half done'
            },
            'priority': {
                '$Type': 'Edm.Byte',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Relative priority, 0 = undefined, 1 = highest, 9 = lowest'
            }
        },
        'Message': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Communication.v1.MessageData',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Email message'
        },
        'MessageData': {
            '$Kind': 'ComplexType',
            'from': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Author(s) of the message'
            },
            'sender': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Agent responsible for the actual transmission of the message, e.g. a secretary'
            },
            'to': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description': 'List of primary recipients'
            },
            'cc': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description': 'List of other recipients (carbon copy)'
            },
            'bcc': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description':
                    'List of recipients whose addresses are not to be revealed (blind carbon copy)'
            },
            'subject': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Topic of the message'
            },
            'body': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Main part of the message'
            },
            'keywords': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description':
                    'List of important words and phrases that might be useful for the recipient'
            },
            'received': {
                '$Type': 'Edm.DateTimeOffset',
                '$Nullable': true,
                '$Precision': 0,
                '@Org.OData.Core.V1.Description': 'Date and time the message was received'
            }
        }
    }
} as CSDL;
