// Last content update: Mon Oct 30 2023 12:01:41 GMT+0100 (GMT+01:00)

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
    'Org.OData.JSON.V1': {
        '$Alias': 'JSON',
        '@Org.OData.Core.V1.Description': 'Terms for JSON properties',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.JSON.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.JSON.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.JSON.V1.md'
            }
        ],
        'Schema': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.JSON.V1.JSON',
            '$AppliesTo': ['EntityType', 'Parameter', 'Property', 'ReturnType', 'Term', 'TypeDefinition'],
            '@Org.OData.Core.V1.RequiresType': 'Edm.Stream',
            '@Org.OData.Core.V1.Description':
                'The JSON Schema for JSON values of the annotated media entity type, property, parameter, return type, term, or type definition',
            '@Org.OData.Core.V1.LongDescription':
                'The schema can be a schema reference, i.e. `{"$ref":"url/of/schemafile#/path/to/schema/within/schemafile"}`'
        },
        'JSON': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.Stream',
            '@Org.OData.Core.V1.Description': 'Textual data of media type `application/json`',
            '@Org.OData.Core.V1.MediaType': 'application/json',
            '@Org.OData.Core.V1.AcceptableMediaTypes': ['application/json']
        }
    }
};
