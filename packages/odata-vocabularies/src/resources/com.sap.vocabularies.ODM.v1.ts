// Last content update: Tue Mar 14 2023 16:11:21 GMT+0100 (Central European Standard Time)

export default {
    $Version: '4.0',
    $Reference: {
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
            $Include: [
                {
                    $Namespace: 'Org.OData.Core.V1',
                    $Alias: 'Core'
                }
            ]
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/Common.json': {
            $Include: [
                {
                    $Namespace: 'com.sap.vocabularies.Common.v1',
                    $Alias: 'Common'
                }
            ]
        }
    },
    'com.sap.vocabularies.ODM.v1': {
        $Alias: 'ODM',
        '@com.sap.vocabularies.Common.v1.Experimental': true,
        '@Org.OData.Core.V1.Description': 'Terms for One Domain Model',
        '@Org.OData.Core.V1.Description#Published': '2020-03-03 © Copyright 2020 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                rel: 'alternate',
                href: 'https://sap.github.io/odata-vocabularies/vocabularies/ODM.xml'
            },
            {
                rel: 'latest-version',
                href: 'https://sap.github.io/odata-vocabularies/vocabularies/ODM.json'
            },
            {
                rel: 'describedby',
                href: 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/ODM.md'
            }
        ],
        codeList: {
            $Kind: 'Term',
            $Type: 'Org.OData.Core.V1.Tag',
            $DefaultValue: true,
            $AppliesTo: ['EntityType', 'EntitySet'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The annotated entity set represents a list of code values, the annotated entity type represents an entry in a code list'
        },
        root: {
            $Kind: 'Term',
            $Type: 'Org.OData.Core.V1.Tag',
            $DefaultValue: true,
            $AppliesTo: ['EntitySet'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'The annotated entity set contains root entities',
            '@Org.OData.Core.V1.LongDescription':
                "Root Entities have an independent lifetime and are reachable as top level resources in APIs. These are usually the key entities of a domain, sometimes also called 'business objects'. They are called aggregate roots in DDD terminology."
        },
        oid: {
            $Kind: 'Term',
            $Type: 'Edm.PropertyPath',
            $AppliesTo: ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The named field is an OID (ODM identifier), and it uniquely identifies an ODM root entity in a customer landscape.',
            '@Org.OData.Core.V1.LongDescription':
                'The technical type can be UUID or String (typical length 128), and the value must be stable and unique at least within type and landscape (better globally). \nAn entity may have other IDs, i.e. a local ID and other alternative IDs. '
        },
        entityName: {
            $Kind: 'Term',
            $AppliesTo: ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Name of an ODM entity as a general concept, not a concrete version thereof',
            '@Org.OData.Core.V1.LongDescription':
                'The annotated OData entity is one of many representations of the ODM entity. Annotating the OData entity with this term helps consumers find APIs that process or expose the same entity.'
        }
    }
};
