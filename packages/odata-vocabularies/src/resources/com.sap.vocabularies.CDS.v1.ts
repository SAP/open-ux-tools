import type { CSDL } from '@sap-ux/vocabularies/CSDL';
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
        'https://sap.github.io/odata-vocabularies/vocabularies/Common.xml': {
            $Include: [
                {
                    $Namespace: 'com.sap.vocabularies.Common.v1',
                    $Alias: 'Common'
                }
            ]
        }
    },
    'com.sap.vocabularies.CDS.v1': {
        $Alias: 'CDS',
        '@Org.OData.Core.V1.Description': 'CDS @assert Annotations',
        AssertIntegrity: {
            $Kind: 'Term',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['EntityContainer', 'EntityType', 'NavigationProperty'],
            '@Org.OData.Core.V1.Description': 'Check referential integrity',
            '@Org.OData.Core.V1.LongDescription': `Value false means: association to one are NOT automatically checked for referential integrity. See: https://cap.cloud.sap/docs/guides/providing-services#refs`
        },
        AssertFormat: {
            $Kind: 'Term',
            $Nullable: true,
            $AppliesTo: ['Property', 'Parameter', 'Term'],
            '@Org.OData.Core.V1.Description':
                'The pattern that a string property, parameter, or term must match. This SHOULD be a valid regular expression, according to the ECMA 262 regular expression dialect.',
            '@Org.OData.Core.V1.LongDescription': `Specifies a regular expression string (in ECMA 262 format in CAP Node.js and java.util.regex.Pattern format in CAP Java) which all string input must match. See: https://cap.cloud.sap/docs/guides/providing-services#assert-format`
        },
        AssertNotNull: {
            $Kind: 'Term',
            $CdsName: 'assert.notNull',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['Property'],
            '@Org.OData.Core.V1.Description': 'Generic not null check will be carried out',
            '@Org.OData.Core.V1.LongDescription': `Value false means: property value is ignored during the generic not null check, for example if your persistence fills it automatically.
                See: https://cap.cloud.sap/docs/guides/providing-services#assert-notNull`
        },
        Title: {
            $Kind: 'Term',
            $Nullable: true,
            '@Org.OData.Core.V1.Description':
                "Used to add short descriptive texts, frequently used for UI labels and mapped to OData's @Common.Label. Supports i18n by {i18n>...}",
            '@Org.OData.Core.V1.IsLanguageDependent': true
        },
        Description: {
            $Kind: 'Term',
            $Nullable: true,
            $AppliesTo: ['EntityType', 'EntitySet', 'Property'],
            '@Org.OData.Core.V1.Description': `Used to add long descriptive texts, which may be used for usage infos shown on UIs and mapped to OData's @Core.Description.
                Supports i18n by {i18n>...}; Note: don't use that for documenting your models, but use block comments instead.`,
            '@Org.OData.Core.V1.IsLanguageDependent': true
        },
        Readonly: {
            $Kind: 'Term',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['EntityType', 'EntitySet', 'Property'],
            '@Org.OData.Core.V1.Description': `Signifies the annotated entity or element as read-only, which is checked by CAP runtimes.
                On entity level translates to OData's respective @Capabilities annotations; on element level it translates to @Core.Computed.`
        },
        Mandatory: {
            $Kind: 'Term',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description': `Signifies the annotated element as mandatory, i.e. user input required. Null/undefined values, as well as empty strings are rejected by CAP runtimes.
                Translates to OData's @FieldControl.Mandatory.`
        },
        Insertonly: {
            $Kind: 'Term',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['EntityType', 'EntitySet'],
            '@Org.OData.Core.V1.Description':
                'Signifies the annotated entity as insert-only, i.e. only INSERT operations are allowed.'
        },
        CdsPersistenceExists: {
            $Kind: 'Term',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['EntityType'],
            '@Org.OData.Core.V1.Description':
                "Used to add short descriptive texts, frequently used for UI labels and mapped to OData's @Common.Label. Supports i18n by {i18n>...}"
        },
        CdsOdataValuelist: {
            $Kind: 'Term',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['EntityType', 'EntitySet'],
            '@Org.OData.Core.V1.Description':
                'Specifies how to get a list of acceptable values for a property or parameter',
            '@Org.OData.Core.V1.LongDescription': `The value list can be based on user input that is passed in the value list request.
            The value list can be used for type-ahead and classical pick lists.`
        },
        OdataDraftEnabled: {
            $Kind: 'Term',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['EntityType', 'EntitySet'],
            '@Org.OData.Core.V1.Description': `State store on the server, so user can intrrupt and continue later on. See:https://cap.cloud.sap/docs/advanced/fiori#fiori-draft-support`
        },
        FioriDraftEnabled: {
            $Kind: 'Term',
            $Type: 'Edm.Boolean',
            $DefaultValue: true,
            $AppliesTo: ['EntityType', 'EntitySet'],
            '@Org.OData.Core.V1.Description':
                'State store on the server, so user can intrrupt and continue later on. See: https://experience.sap.com/fiori-design-web/draft-handling'
        }
    }
} as CSDL;

/**
 * proposal Daniel
 */

/**
  module.exports = {
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
'https://sap.github.io/odata-vocabularies/vocabularies/Common.xml': {
$Include: [
{
$Namespace: 'com.sap.vocabularies.Common.v1',
$Alias: 'Common'
}
]
}
},
'com.sap.vocabularies.CDS.v1': {
$Alias: '',
'@Common.Experimental': true,
'@Core.Description': 'CDS Annotations',
title: {
$Kind: 'Term',
$Nullable: true,
$AppliesTo: ['EntityType', 'EntitySet', 'Property'],
'@Core.Description':
'Used to add short descriptive texts, frequently used for UI labels and mapped to OData\'s @Common.Label. Supports i18n by {i18n>...}'
},
description: {
$Kind: 'Term',
$Nullable: true,
$AppliesTo: ['EntityType', 'EntitySet', 'Property'],
'@Core.Description':
'Used to add long descriptive texts, which may be used for usage infos shown on UIs and mapped to OData\'s @Core.Description. Supports i18n by {i18n>...}; Note: don\'t use that for documenting your models, but use block comments instead.'
},
readonly: {
$Kind: 'Term',
$Type: 'Core.V1.Tag',
$Nullable: true,
$AppliesTo: ['EntityType', 'EntitySet', 'Property'],
'@Core.Description':
'Signifies the annotated entity or element as read-only, which is checked by CAP runtimes. On entity level translates to OData\'s respective @Capabilities annotations; on element level it translates to @Core.Computed.'
},
insertonly: {
$Kind: 'Term',
$Type: 'Core.V1.Tag',
$Nullable: true,
$AppliesTo: ['EntityType', 'EntitySet'],
'@Core.Description':
'Signifies the annotated entity as insert-only, i.e. only INSERT operations are allowed.'
},
mandatory: {
$Kind: 'Term',
$Type: 'Core.V1.Tag',
$Nullable: true,
$AppliesTo: ['Property'],
'@Core.Description':
'Signifies the annotated element as mandatory, i.e. user input required. Null/undefined values, as well as empty strings are rejected by CAP runtimes. Translates to OData\'s @FieldControl.Mandatory.'
},
path: {
$Kind: 'Term',
$Type: 'Core.V1.Tag',
$Nullable: true,
$AppliesTo: ['EntityContainer'],
'@Core.Description':
'Specifies the endpoint at which the annotated service will be served.'
},
impl: {
$Kind: 'Term',
$Type: 'Core.V1.Tag',
$Nullable: true,
$AppliesTo: ['EntityContainer'],
'@Core.Description':
'Specifies a service implementation.'
},
},
 
 
'com.sap.vocabularies.CDS.asserts.v1': {
$Alias: 'assert',
'@Common.Experimental': true,
'@Core.Description': 'CDS @assert Annotations',
unique: {
$Kind: 'Term',
$Nullable: true,
$AppliesTo: ['EntityType', 'EntitySet'],
'@Core.Description':
'Allows to specify custom unique constraints on field combinations. See: https://cap.cloud.sap/docs/guides/providing-services#unique'
},
integrity: {
$Kind: 'Term',
$Nullable: true,
$AppliesTo: ['NavigationProperty'],
'@Core.Description':
'See: https://cap.cloud.sap/docs/guides/providing-services#refs'
},
format: {
$Kind: 'Term',
$Nullable: true,
$AppliesTo: ['Property'],
'@Core.Description':
'See: https://cap.cloud.sap/docs/guides/providing-services#assert-format'
},
range: {
$Kind: 'Term',
$Nullable: true,
$AppliesTo: ['Property'],
'@Core.Description':
'See: https://cap.cloud.sap/docs/guides/providing-services#assert-range'
},
},
 
 
'com.sap.vocabularies.CDS.odata.v1': {
$Alias: 'odata',
'@Common.Experimental': true,
'@Core.Description': 'CDS @odata Annotations',
etag: {
$Kind: 'Term',
$Type: 'Core.V1.Tag',
$Nullable: true,
$AppliesTo: ['Property'],
'@Core.Description':
'Signifies the annotated element as the data provider to calculate ETags from.'
},
Type: {
$Kind: 'Term',
$Nullable: true,
$AppliesTo: ['SimpleType','Property'],
'@Core.Description':
'Overrides the default type to be used in generated OData $metadata documents.'
},
singleton: {
$Kind: 'Term',
$Nullable: true,
$Type: 'Core.V1.Tag',
$AppliesTo: ['EntityType', 'EntitySet'],
'@Core.Description':
'Creates an emdx:Singleton in the OData output'
},
},
}
 */

// AssertUnique: {
//     $Kind: 'Term',
//     $Type: 'Edm.Boolean',
//     $DefaultValue: true,
//     $AppliesTo: ['EntityType', 'EntitySet'],
//     '@Org.OData.Core.V1.Description': 'Enforce uniqueness',
//     '@Org.OData.Core.V1.LongDescription': `Allows to specify custom unique constraints on field combinations. See: https://cap.cloud.sap/docs/guides/generic#unique`
// },
// AssertRange: {
//     $Kind: 'Term',
//     $Nullable: true,
//     $Type: ['Edm.String', 'Edm.Boolean', 'Edm.Date', 'Edm.Int16', 'Edm.Int32', 'Edm.Int64'],
//     $AppliesTo: ['Property'],
//     '@Org.OData.Core.V1.Description': 'Perform check min ≤ input ≤ max',
//     '@Org.OData.Core.V1.LongDescription':
//         'Validates that a given number or DateTime object is between some minimum and maximum. It allow to specifying [ min, max ] ranges for elements with ordinal types — that is, numeric or date/time types See: https://cap.cloud.sap/docs/guides/providing-services#assert-range'
// },
