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
    'Org.OData.Authorization.V1': {
        '$Alias': 'Authorization',
        '@Org.OData.Core.V1.Description':
            'The Authorization Vocabulary provides terms for describing authorization requirements of the service',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Authorization.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Authorization.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Authorization.V1.md'
            }
        ],
        'SecuritySchemes': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Authorization.V1.SecurityScheme',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'At least one of the specified security schemes are required to make a request against the service'
        },
        'SecurityScheme': {
            '$Kind': 'ComplexType',
            'Authorization': {
                '$Type': 'Org.OData.Authorization.V1.SchemeName',
                '@Org.OData.Core.V1.Description': 'The name of a required authorization scheme'
            },
            'RequiredScopes': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description': 'The names of scopes required from this authorization scheme'
            }
        },
        'Authorizations': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Authorization.V1.Authorization',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Lists the methods supported by the service to authorize access'
        },
        'Authorization': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '@Org.OData.Core.V1.Description': 'Base type for all Authorization types',
            'Name': {
                '@Org.OData.Core.V1.Description': 'Name that can be used to reference the authorization scheme'
            },
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Description of the authorization scheme'
            }
        },
        'OpenIDConnect': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Authorization.V1.Authorization',
            'IssuerUrl': {
                '@Org.OData.Core.V1.Description':
                    'Issuer location for the OpenID Provider. Configuration information can be obtained by appending `/.well-known/openid-configuration` to this Url.',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'Http': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Authorization.V1.Authorization',
            'Scheme': {
                '@Org.OData.Core.V1.Description':
                    'HTTP Authorization scheme to be used in the Authorization header, as per RFC7235'
            },
            'BearerFormat': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Format of the bearer token'
            }
        },
        'OAuthAuthorization': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '$BaseType': 'Org.OData.Authorization.V1.Authorization',
            'Scopes': {
                '$Collection': true,
                '$Type': 'Org.OData.Authorization.V1.AuthorizationScope',
                '@Org.OData.Core.V1.Description': 'Available scopes'
            },
            'RefreshUrl': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Refresh Url',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'OAuth2ClientCredentials': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Authorization.V1.OAuthAuthorization',
            'TokenUrl': {
                '@Org.OData.Core.V1.Description': 'Token Url',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'OAuth2Implicit': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Authorization.V1.OAuthAuthorization',
            '@Org.OData.Core.V1.Description':
                'Security note: OAuth2 implicit grant is considered to be not secure and should not be used by clients, see [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics.html#name-implicit-grant).',
            'AuthorizationUrl': {
                '@Org.OData.Core.V1.Description': 'Authorization URL',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'OAuth2Password': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Authorization.V1.OAuthAuthorization',
            'TokenUrl': {
                '@Org.OData.Core.V1.Description': 'Token Url',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'OAuth2AuthCode': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Authorization.V1.OAuthAuthorization',
            'AuthorizationUrl': {
                '@Org.OData.Core.V1.Description': 'Authorization URL',
                '@Org.OData.Core.V1.IsURL': true
            },
            'TokenUrl': {
                '@Org.OData.Core.V1.Description': 'Token Url',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'AuthorizationScope': {
            '$Kind': 'ComplexType',
            'Scope': {
                '@Org.OData.Core.V1.Description': 'Scope name'
            },
            'Grant': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Identity that has access to the scope or can grant access to the scope.'
            },
            'Description': {
                '@Org.OData.Core.V1.Description': 'Description of the scope'
            }
        },
        'ApiKey': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Authorization.V1.Authorization',
            'KeyName': {
                '@Org.OData.Core.V1.Description': 'The name of the header or query parameter'
            },
            'Location': {
                '$Type': 'Org.OData.Authorization.V1.KeyLocation',
                '@Org.OData.Core.V1.Description': 'Whether the API Key is passed in the header or as a query option'
            }
        },
        'KeyLocation': {
            '$Kind': 'EnumType',
            'Header': 0,
            'Header@Org.OData.Core.V1.Description': 'API Key is passed in the header',
            'QueryOption': 1,
            'QueryOption@Org.OData.Core.V1.Description': 'API Key is passed as a query option',
            'Cookie': 2,
            'Cookie@Org.OData.Core.V1.Description': 'API Key is passed as a cookie'
        },
        'SchemeName': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'The name of the authorization scheme.'
        }
    }
} as CSDL;
