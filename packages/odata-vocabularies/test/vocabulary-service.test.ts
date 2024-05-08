import { ENTITY_TYPE_KIND, PROPERTY_KIND, COLLECTION_KIND, ENTITY_SET_KIND } from '@sap-ux/odata-annotation-core-types';
import type { AliasInformation } from '@sap-ux/odata-annotation-core-types';
import { TermApplicability } from '../src/types/vocabulary-service';
import { VocabularyService } from '../src/vocabulary-service';
declare const expect: jest.Expect;

const vocabularyService = new VocabularyService();
const namespace = 'com.sap.vocabularies.UI.v1';
const term = 'com.sap.vocabularies.UI.v1.LineItem';
const targetKind = ENTITY_TYPE_KIND;
const aliasInfo: AliasInformation = {
    aliasMap: {
        'SAPUI': 'com.sap.vocabularies.UI.v1',
        'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1',
        'com.sap.vocabularies.HTML5.v1': 'com.sap.vocabularies.HTML5.v1'
    },
    aliasMapMetadata: {},
    aliasMapVocabulary: {},
    currentFileAlias: '',
    currentFileNamespace: 'local',
    reverseAliasMap: {
        'com.sap.vocabularies.Common.v1': 'Common',
        'com.sap.vocabularies.HTML5.v1': 'HTML5',
        'com.sap.vocabularies.UI.v1': 'SAPUI'
    }
};

it('getVocabularies() contains UI but not CDS', () => {
    const vocabularies = vocabularyService.getVocabularies();

    // Expect
    expect(vocabularies.get(namespace)).toMatchInlineSnapshot(`
        Object {
          "defaultAlias": "UI",
          "defaultUri": "https://sap.github.io/odata-vocabularies/vocabularies/UI.xml",
          "namespace": "com.sap.vocabularies.UI.v1",
        }
    `);
    expect(vocabularies.get('com.sap.vocabularies.CDS.v1')).toBeFalsy();
});

describe('getVocabularyNamespace()', () => {
    it('UI.DataField', () => {
        // Expect
        expect(vocabularyService.getVocabularyNamespace('UI.DataField')).toMatchInlineSnapshot(
            `"com.sap.vocabularies.UI.v1"`
        );
    });

    it('com.sap.vocabularies.UI.v1.DataField', () => {
        // Expect
        expect(vocabularyService.getVocabularyNamespace('com.sap.vocabularies.UI.v1.DataField')).toMatchInlineSnapshot(
            `"com.sap.vocabularies.UI.v1"`
        );
    });

    it('invalidName.space', () => {
        // Expect
        expect(vocabularyService.getVocabularyNamespace('invalidName.space')).toStrictEqual(undefined);
    });
});

describe('getVocabulary()', () => {
    it('UI', () => {
        // Expect
        expect(vocabularyService.getVocabulary('UI')).toMatchInlineSnapshot(`
                    Object {
                      "defaultAlias": "UI",
                      "defaultUri": "https://sap.github.io/odata-vocabularies/vocabularies/UI.xml",
                      "namespace": "com.sap.vocabularies.UI.v1",
                    }
            `);
    });

    it('com.sap.vocabularies.UI.v1', () => {
        // Expect
        expect(vocabularyService.getVocabulary('com.sap.vocabularies.UI.v1')).toMatchInlineSnapshot(`
                    Object {
                      "defaultAlias": "UI",
                      "defaultUri": "https://sap.github.io/odata-vocabularies/vocabularies/UI.xml",
                      "namespace": "com.sap.vocabularies.UI.v1",
                    }
            `);
    });

    it('some.invalid.name', () => {
        // Expect
        expect(vocabularyService.getVocabulary('some.invalid.name')).toMatchInlineSnapshot(`null`);
    });
});

describe('getTermsForTargetKind()', () => {
    it('"EntityType", "Edm.String"', () => {
        // Expect
        expect(vocabularyService.getTermsForTargetKinds([targetKind], 'Edm.String').includes(term)).toBeTruthy();
    });

    it('["Property", "Collection"], "Collection(Edm.String)"', () => {
        // Expect
        expect(
            vocabularyService
                .getTermsForTargetKinds([PROPERTY_KIND, COLLECTION_KIND], 'Collection(Edm.String)')
                .includes('Org.OData.Validation.V1.MaxItems')
        ).toBeTruthy();
    });
});

describe('checkTermApplicability()', () => {
    it('IsValid', () => {
        // Expect
        expect(vocabularyService.checkTermApplicability(term, [targetKind], 'Edm.String')).toBe(
            TermApplicability.Applicable
        );
    });

    it('IsValid (for collection)', () => {
        // Expect
        expect(
            vocabularyService.checkTermApplicability(
                'Org.OData.Validation.V1.MaxItems',
                [PROPERTY_KIND, COLLECTION_KIND],
                'Edm.String'
            )
        ).toBe(TermApplicability.Applicable);
    });

    it('TermNotApplicable', () => {
        // Expect
        expect(vocabularyService.checkTermApplicability(term, [ENTITY_SET_KIND], 'Edm.String')).toBe(
            TermApplicability.TermNotApplicable
        );
    });

    it('UnknownTerm', () => {
        // Expect
        expect(vocabularyService.checkTermApplicability(term + '_', [targetKind], 'Edm.String')).toBe(
            TermApplicability.UnknownTerm
        );
    });

    it('UnSupportedVocabulary', () => {
        // Expect
        expect(vocabularyService.checkTermApplicability('_' + term, [targetKind], 'Edm.String')).toBe(
            TermApplicability.UnSupportedVocabulary
        );
    });
});

it('getTerm()', () => {
    // Expect
    expect(vocabularyService.getTerm(term)).toMatchInlineSnapshot(`
            Object {
              "appliesTo": Array [
                "EntityType",
              ],
              "description": "Collection of data fields for representation in a table or list",
              "isCollection": true,
              "kind": "Term",
              "name": "com.sap.vocabularies.UI.v1.LineItem",
              "type": "com.sap.vocabularies.UI.v1.DataFieldAbstract",
            }
        `);
});

describe('getType()', () => {
    it('UI.ChartAxisAutoScaleBehaviorType (complex type)', () => {
        // Expect
        expect(vocabularyService.getType(namespace + '.ChartAxisAutoScaleBehaviorType')).toMatchInlineSnapshot(`
            Object {
              "kind": "ComplexType",
              "name": "com.sap.vocabularies.UI.v1.ChartAxisAutoScaleBehaviorType",
              "properties": Map {
                "ZeroAlwaysVisible" => Object {
                  "defaultValue": true,
                  "description": "Forces the value axis to always display the zero value",
                  "isCollection": false,
                  "kind": "Property",
                  "name": "ZeroAlwaysVisible",
                  "type": "Edm.Boolean",
                },
                "DataScope" => Object {
                  "defaultValue": "DataSet",
                  "description": "Determines the automatic scaling",
                  "isCollection": false,
                  "kind": "Property",
                  "name": "DataScope",
                  "type": "com.sap.vocabularies.UI.v1.ChartAxisAutoScaleDataScopeType",
                },
              },
            }
        `);
    });

    it('UI.ChartAxisScaleBehaviorType (enum type)', () => {
        // Expect
        expect(vocabularyService.getType(namespace + '.ChartAxisScaleBehaviorType')).toMatchInlineSnapshot(`
            Object {
              "deprecated": false,
              "isFlags": false,
              "kind": "EnumType",
              "name": "com.sap.vocabularies.UI.v1.ChartAxisScaleBehaviorType",
              "values": Array [
                Object {
                  "description": "Value axes scale automatically",
                  "kind": "Member",
                  "name": "AutoScale",
                  "value": 0,
                },
                Object {
                  "description": "Fixed minimum and maximum values are applied, which are derived from the @UI.MeasureAttributes.DataPoint/MinimumValue and .../MaximumValue annotation by default.
                    For stacking chart types with multiple measures, they are taken from ChartAxisScalingType/FixedScaleMultipleStackedMeasuresBoundaryValues.
                        ",
                  "kind": "Member",
                  "name": "FixedScale",
                  "value": 1,
                },
              ],
            }
        `);
    });

    it('UI.RecommendationStateType (type definition)', () => {
        // Expect
        expect(vocabularyService.getType(namespace + '.RecommendationStateType')).toMatchInlineSnapshot(`
            Object {
              "constraints": Object {
                "allowedValues": Array [
                  Object {
                    "description": "regular - with human or default input, no recommendation",
                    "longDescription": "",
                    "value": 0,
                  },
                  Object {
                    "description": "highlighted - without human input and with recommendation",
                    "longDescription": "",
                    "value": 1,
                  },
                  Object {
                    "description": "warning - with human or default input and with recommendation",
                    "longDescription": "",
                    "value": 2,
                  },
                ],
              },
              "description": "Indicates whether a field contains or has a recommended value",
              "kind": "TypeDefinition",
              "longDescription": "Editable fields for which a recommendation has been pre-filled or that have recommendations that differ from existing human input need to be highlighted.",
              "name": "com.sap.vocabularies.UI.v1.RecommendationStateType",
              "underlyingType": "Edm.Byte",
            }
        `);
    });
});

describe('getDerivedTypeNames', () => {
    it('(UI.DataField, includeAbstractFalse', () => {
        // Expect
        expect(vocabularyService.getDerivedTypeNames(namespace + '.DataField')).toMatchInlineSnapshot(`
            Set {
              "com.sap.vocabularies.UI.v1.DataField",
              "com.sap.vocabularies.UI.v1.DataFieldWithAction",
              "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation",
              "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath",
              "com.sap.vocabularies.UI.v1.DataFieldWithUrl",
              "com.sap.vocabularies.UI.v1.DataFieldWithActionGroup",
            }
        `);
    });

    it('UI.DataFieldAbstract, includeAbstractFalse', () => {
        // Expect
        expect(vocabularyService.getDerivedTypeNames(namespace + '.DataFieldAbstract')).toMatchInlineSnapshot(`
            Set {
              "com.sap.vocabularies.UI.v1.DataFieldForAnnotation",
              "com.sap.vocabularies.UI.v1.DataFieldForActionGroup",
              "com.sap.vocabularies.UI.v1.DataField",
              "com.sap.vocabularies.UI.v1.DataFieldForAction",
              "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation",
              "com.sap.vocabularies.UI.v1.DataFieldWithAction",
              "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation",
              "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath",
              "com.sap.vocabularies.UI.v1.DataFieldWithUrl",
              "com.sap.vocabularies.UI.v1.DataFieldWithActionGroup",
            }
        `);
    });

    it('UI.DataFieldAbstract, includeAbstractTrue', () => {
        // Expect
        expect(vocabularyService.getDerivedTypeNames(namespace + '.DataFieldAbstract', true)).toMatchInlineSnapshot(`
            Set {
              "com.sap.vocabularies.UI.v1.DataFieldAbstract",
              "com.sap.vocabularies.UI.v1.DataFieldForAnnotation",
              "com.sap.vocabularies.UI.v1.DataFieldForActionAbstract",
              "com.sap.vocabularies.UI.v1.DataFieldForActionGroup",
              "com.sap.vocabularies.UI.v1.DataField",
              "com.sap.vocabularies.UI.v1.DataFieldForAction",
              "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation",
              "com.sap.vocabularies.UI.v1.DataFieldWithAction",
              "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation",
              "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath",
              "com.sap.vocabularies.UI.v1.DataFieldWithUrl",
              "com.sap.vocabularies.UI.v1.DataFieldWithActionGroup",
            }
        `);
    });
});

it('getComplexType(UI.DataFieldAbstract)', () => {
    // Expect
    expect(vocabularyService.getComplexType(namespace + '.DataFieldAbstract')).toMatchInlineSnapshot(`
Object {
  "baseTypes": Array [],
  "constraints": Object {
    "applicableTerms": Array [
      "com.sap.vocabularies.UI.v1.Hidden",
      "com.sap.vocabularies.UI.v1.Importance",
      "com.sap.vocabularies.UI.v1.PartOfPreview",
      "com.sap.vocabularies.HTML5.v1.CssDefaults",
      "com.sap.vocabularies.Common.v1.FieldControl",
    ],
  },
  "description": "Elementary building block that represents a piece of data and/or allows triggering an action",
  "isAbstract": true,
  "kind": "ComplexType",
  "longDescription": "By using the applicable terms UI.Hidden, UI.Importance or HTML5.CssDefaults, the visibility, the importance and
          and the default css settings (as the width) of the data field can be influenced. ",
  "name": "com.sap.vocabularies.UI.v1.DataFieldAbstract",
  "properties": Map {
    "Label" => Object {
      "constraints": Object {
        "isLanguageDependent": true,
      },
      "description": "A short, human-readable text suitable for labels and captions in UIs",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "Label",
      "type": "Edm.String",
    },
    "Criticality" => Object {
      "description": "Criticality of the data field value",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "Criticality",
      "type": "com.sap.vocabularies.UI.v1.CriticalityType",
    },
    "CriticalityRepresentation" => Object {
      "description": "Decides if criticality is visualized in addition by means of an icon",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "CriticalityRepresentation",
      "type": "com.sap.vocabularies.UI.v1.CriticalityRepresentationType",
    },
    "IconUrl" => Object {
      "description": "Optional icon",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "IconUrl",
      "type": "Edm.String",
    },
  },
}
`);
});

it('getComplexType(UI.DataFieldForAction) derived type', () => {
    // Expect
    expect(vocabularyService.getComplexType(namespace + '.DataFieldForAction')).toMatchInlineSnapshot(`
Object {
  "baseTypes": Array [
    "com.sap.vocabularies.UI.v1.DataFieldForActionAbstract",
    "com.sap.vocabularies.UI.v1.DataFieldAbstract",
  ],
  "constraints": Object {
    "applicableTerms": Array [
      "com.sap.vocabularies.UI.v1.Hidden",
      "com.sap.vocabularies.UI.v1.Importance",
      "com.sap.vocabularies.UI.v1.PartOfPreview",
      "com.sap.vocabularies.HTML5.v1.CssDefaults",
      "com.sap.vocabularies.Common.v1.FieldControl",
    ],
  },
  "description": "Triggers an OData action",
  "kind": "ComplexType",
  "longDescription": "The action is NOT tied to a data value (in contrast to [DataFieldWithAction](#DataFieldWithAction)).",
  "name": "com.sap.vocabularies.UI.v1.DataFieldForAction",
  "properties": Map {
    "Action" => Object {
      "description": "Name of an Action, Function, ActionImport, or FunctionImport in scope",
      "isCollection": false,
      "kind": "Property",
      "name": "Action",
      "type": "com.sap.vocabularies.UI.v1.ActionName",
    },
    "InvocationGrouping" => Object {
      "description": "Expresses how invocations of this action on multiple instances should be grouped",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "InvocationGrouping",
      "type": "com.sap.vocabularies.UI.v1.OperationGroupingType",
    },
    "Inline" => Object {
      "defaultValue": false,
      "description": "Action should be placed close to (or even inside) the visualized term",
      "isCollection": false,
      "kind": "Property",
      "name": "Inline",
      "type": "Edm.Boolean",
    },
    "Determining" => Object {
      "defaultValue": false,
      "description": "Determines whether the action completes a process step (e.g. approve, reject).",
      "isCollection": false,
      "kind": "Property",
      "name": "Determining",
      "type": "Edm.Boolean",
    },
    "Label" => Object {
      "constraints": Object {
        "isLanguageDependent": true,
      },
      "description": "A short, human-readable text suitable for labels and captions in UIs",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "Label",
      "type": "Edm.String",
    },
    "Criticality" => Object {
      "description": "Criticality of the data field value",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "Criticality",
      "type": "com.sap.vocabularies.UI.v1.CriticalityType",
    },
    "CriticalityRepresentation" => Object {
      "description": "Decides if criticality is visualized in addition by means of an icon",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "CriticalityRepresentation",
      "type": "com.sap.vocabularies.UI.v1.CriticalityRepresentationType",
    },
    "IconUrl" => Object {
      "description": "Optional icon",
      "facets": Object {
        "isNullable": true,
      },
      "isCollection": false,
      "kind": "Property",
      "name": "IconUrl",
      "type": "Edm.String",
    },
  },
}
`);
});

describe('getComplexTypeProperty()', () => {
    it('UI.DataFieldForAnnotation/Criticality (inherited)', () => {
        // Expect
        expect(vocabularyService.getComplexTypeProperty(namespace + '.DataFieldForAnnotation', 'Criticality'))
            .toMatchInlineSnapshot(`
            Object {
              "description": "Criticality of the data field value",
              "facets": Object {
                "isNullable": true,
              },
              "isCollection": false,
              "kind": "Property",
              "name": "Criticality",
              "type": "com.sap.vocabularies.UI.v1.CriticalityType",
            }
        `);
    });

    it('UI.DataFieldForAnnotation/Target (with AllowedTerms)', () => {
        // Expect
        expect(vocabularyService.getComplexTypeProperty(namespace + '.DataFieldForAnnotation', 'Target'))
            .toMatchInlineSnapshot(`
            Object {
              "constraints": Object {
                "allowedTerms": Array [
                  "com.sap.vocabularies.Communication.v1.Address",
                  "com.sap.vocabularies.Communication.v1.Contact",
                  "com.sap.vocabularies.UI.v1.Chart",
                  "com.sap.vocabularies.UI.v1.ConnectedFields",
                  "com.sap.vocabularies.UI.v1.DataPoint",
                  "com.sap.vocabularies.UI.v1.FieldGroup",
                ],
              },
              "description": "Target MUST reference an annotation of terms Communication.Contact, Communication.Address, UI.DataPoint, UI.Chart, UI.FieldGroup, or UI.ConnectedFields",
              "isCollection": false,
              "kind": "Property",
              "name": "Target",
              "type": "Edm.AnnotationPath",
            }
        `);
    });

    it('UI.ChartDefinitionType/DynamicMeasures (with AllowedTerms using Alias)', () => {
        // Expect
        expect(vocabularyService.getComplexTypeProperty(namespace + '.ChartDefinitionType', 'DynamicMeasures'))
            .toMatchInlineSnapshot(`
            Object {
              "constraints": Object {
                "allowedTerms": Array [
                  "com.sap.vocabularies.Analytics.v1.AggregatedProperty",
                  "Org.OData.Aggregation.V1.CustomAggregate",
                ],
              },
              "description": "Dynamic properties introduced by annotations and used as measures of the chart",
              "isCollection": true,
              "kind": "Property",
              "longDescription": "If the annotation referenced by an annotation path does not apply to the same collection of entities
                        as the one being visualized according to the \`UI.Chart\` annotation, the annotation path MUST be silently ignored.",
              "name": "DynamicMeasures",
              "type": "Edm.AnnotationPath",
            }
        `);
    });

    it('UI.DataFieldWithUrl/URL (with Applicable Terms)', () => {
        // Expect
        expect(vocabularyService.getComplexTypeProperty(namespace + '.DataFieldWithUrl', 'Url')).toMatchInlineSnapshot(`
            Object {
              "constraints": Object {
                "applicableTerms": Array [
                  "com.sap.vocabularies.HTML5.v1.LinkTarget",
                ],
              },
              "description": "Target of the hyperlink",
              "isCollection": false,
              "kind": "Property",
              "name": "Url",
              "type": "Edm.String",
            }
        `);
    });
});

describe('getDocumentation()', () => {
    it('Term', () => {
        // Expect
        expect(vocabularyService.getDocumentation('com.sap.vocabularies.UI.v1.LineItem')).toMatchInlineSnapshot(`
            Array [
              "**Kind:** Term 
            ",
              "**Description:** Collection of data fields for representation in a table or list 
            ",
              "**Applies To:** EntityType 
            ",
              "**Type:** Collection(com.sap.vocabularies.UI.v1.DataFieldAbstract) 
             
            ",
              "**Type Description:** Elementary building block that represents a piece of data and/or allows triggering an action 
            ",
              "**Type Long Description:** By using the applicable terms UI.Hidden, UI.Importance or HTML5.CssDefaults, the visibility, the importance and
                      and the default css settings (as the width) of the data field can be influenced.  
            ",
              "**Nullable Item:** false 
            ",
            ]
        `);
    });

    it('Complex Type', () => {
        // Expect
        expect(
            vocabularyService.getDocumentation('com.sap.vocabularies.UI.v1.DataFieldForAction', undefined, aliasInfo)
        ).toMatchInlineSnapshot(`
Array [
  "**Kind:** ComplexType 
",
  "**Description:** Triggers an OData action 
",
  "**Long Description:** The action is NOT tied to a data value (in contrast to [DataFieldWithAction](#DataFieldWithAction)). 
",
  "",
  "**BaseType:** SAPUI.DataFieldForActionAbstract 
",
  "**Nullable:** false 
",
  "**Applicable Terms:**  
SAPUI.Hidden  
SAPUI.Importance  
SAPUI.PartOfPreview  
HTML5.CssDefaults  
Common.FieldControl 
",
]
`);
    });

    it('Deprecated', () => {
        expect(vocabularyService.getDocumentation('com.sap.vocabularies.Analytics.v1.Dimension'))
            .toMatchInlineSnapshot(`
            Array [
              "**Deprecated:** Deprecated in favor of [\`AnalyticalContext/Dimension\`](#AnalyticalContext) 
            ",
              "**Kind:** Term 
            ",
              "**Description:** A property holding the key of a dimension in an analytical context 
            ",
              "**Base Term:** Org.OData.Aggregation.V1.Groupable 
            ",
              "**Applies To:** Property 
            ",
              "**Type:** Org.OData.Core.V1.Tag 
            ",
              "**Type Description:** This is the type to use for all tagging terms 
            ",
              "**DefaultValue:** true 
            ",
              "**Nullable:** false 
            ",
            ]
        `);
    });

    it('Requires Type', () => {
        expect(vocabularyService.getDocumentation('com.sap.vocabularies.Common.v1.IsCalendarYear'))
            .toMatchInlineSnapshot(`
            Array [
              "**Kind:** Term 
            ",
              "**Description:** Property encodes a year number as string following the logical pattern (-?)YYYY(Y*) consisting of an optional
                        minus sign for years B.C. followed by at least four digits. The string matches the regex pattern -?([1-9][0-9]{3,}|0[0-9]{3})
                       
            ",
              "**Applies To:** Property 
            ",
              "**Type:** Org.OData.Core.V1.Tag 
            ",
              "**Type Description:** This is the type to use for all tagging terms 
            ",
              "**Require Type:** Edm.String 
            ",
              "**DefaultValue:** true 
            ",
              "**Nullable:** false 
            ",
            ]
        `);
    });

    it('Experimental', () => {
        expect(vocabularyService.getDocumentation('com.sap.vocabularies.Common.v1.IsLanguageIdentifier'))
            .toMatchInlineSnapshot(`
            Array [
              "**Experimental:** Terms, types, and properties annotated with this term are experimental and can be changed incompatibly or removed completely any time without prior warning. Do not use or rely on experimental terms, types, and properties in production environments. 
            ",
              "**Kind:** Term 
            ",
              "**Description:** An identifier to distinguish multiple texts in different languages for the same entity 
            ",
              "**Applies To:** Property 
            ",
              "**Type:** Org.OData.Core.V1.Tag 
            ",
              "**Type Description:** This is the type to use for all tagging terms 
            ",
              "**DefaultValue:** true 
            ",
              "**Nullable:** false 
            ",
            ]
        `);
    });

    it('Complex Type Property', () => {
        // Expect
        expect(vocabularyService.getDocumentation('com.sap.vocabularies.UI.v1.DataFieldForAction', 'Label'))
            .toMatchInlineSnapshot(`
            Array [
              "**Description:** A short, human-readable text suitable for labels and captions in UIs 
            ",
              "**Type:** Edm.String 
            ",
              "**IsLanguageDependent:** Properties and terms annotated with this term are language-dependent 
            ",
              "**Nullable:** true 
            ",
            ]
        `);
    });

    it('Enum Type', () => {
        // Expect
        expect(vocabularyService.getDocumentation('com.sap.vocabularies.UI.v1.ImportanceType', 'Low'))
            .toMatchInlineSnapshot(`
            Array [
              "**Kind:** EnumType 
            ",
              "",
              "**Enum Value Kind:** Member 
            ",
              "**Enum Value Description:** Low importance 
            ",
            ]
        `);
    });
});
