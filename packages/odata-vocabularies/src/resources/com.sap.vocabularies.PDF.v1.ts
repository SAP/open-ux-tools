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
        'https://sap.github.io/odata-vocabularies/vocabularies/Common.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.Common.v1',
                    '$Alias': 'Common'
                }
            ]
        }
    },
    'com.sap.vocabularies.PDF.v1': {
        '$Alias': 'PDF',
        '@Org.OData.Core.V1.Description': 'Terms for PDF response format',
        '@Org.OData.Core.V1.LongDescription':
            'The PDF vocabulary provides information about the PDF format of a response',
        '@Org.OData.Core.V1.Description#Published': '2021-10-27 © Copyright 2021 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/PDF.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/PDF.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/PDF.md'
            }
        ],
        'Features': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.PDF.v1.FeaturesType',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Features for the PDF'
        },
        'FeaturesType': {
            '$Kind': 'ComplexType',
            'DocumentDescriptionReference': {
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'Reference of the Service for the DocumentDescription'
            },
            'DocumentDescriptionCollection': {
                '@Org.OData.Core.V1.Description': 'Name of entity set containing the DocumentDescription'
            },
            'ArchiveFormat': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'PDF/A conformant format supported'
            },
            'Signature': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Signing the document supported'
            },
            'CoverPage': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Cover Page supported'
            },
            'FontName': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Font name supported'
            },
            'FontSize': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Font size supported'
            },
            'Margin': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Margin size supported'
            },
            'Border': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Border size of the table supported'
            },
            'FitToPage': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Fit to page supported',
                '@Org.OData.Core.V1.LongDescription':
                    'If this option is selected, the font size is automatically selected in such a way that all columns of a table fit on one page. Other layout options like margin, border and composite cell spacing are adapted accordingly, with respect to the chose scaling factor.'
            },
            'Padding': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Padding of document supported',
                '@Org.OData.Core.V1.LongDescription': 'Is padding (left, right, bottom, top) supported?'
            },
            'HeaderFooter': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Page header and footer supported',
                '@Org.OData.Core.V1.LongDescription':
                    'Headers and footers are areas in the top and the bottom page margins, where you can add page number and date information'
            },
            'ResultSizeDefault': {
                '$Type': 'Edm.Int32',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Default result size',
                '@Org.OData.Core.V1.LongDescription':
                    ' Default result size for PDF documents. Used if $top has not been provided.'
            },
            'ResultSizeMaximum': {
                '$Type': 'Edm.Int32',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Maximum result size',
                '@Org.OData.Core.V1.LongDescription':
                    'Max result size for PDF documents. Used if $top has been provided and $top > ResultSizeMaximum'
            },
            'IANATimezoneFormat': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'If this is true, the PDF format supports formatting columns of type `Edm.DateTimeOffset` in a IANA time zone given in the document description'
            },
            'Treeview': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Treeview output supported',
                '@Org.OData.Core.V1.LongDescription':
                    'If this is true, treeview output is supported for hierarchical data'
            },
            'TextDirectionLayout': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Setting the text direction-layout is supported',
                '@Org.OData.Core.V1.LongDescription':
                    'PDF supports setting the text direction-layout (e.g. left-to-right or right-to-left) in the document description'
            },
            'UploadToFileShare': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Support of PDF document upload',
                '@Org.OData.Core.V1.LongDescription':
                    'A file share connection needs to be configured on the server. \nThe response of a corresponding request is then `301 Moved Permanently` with a `Location` header containing the link to the document on the file share server.'
            }
        }
    }
} as CSDL;
