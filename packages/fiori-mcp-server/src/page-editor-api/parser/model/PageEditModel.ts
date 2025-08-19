import { join } from 'path';
import type { JSONSchema4 } from 'json-schema';
import { ArtifactType, DirName, PageType } from '@sap/ux-specification/dist/types/src';
import type { PageConfig } from '@sap/ux-specification/dist/types/src';
import { ObjectAggregation } from './ObjectAggregation';
import { SectionsAggregation } from './sections/SectionsAggregation';
import { ColumnsAggregation, TableAggregation } from './table';
import { ArrayAggregation } from './ArrayAggregation';
import { AggregationValidator } from './AggregationValidator';
import type {
    ModelParserParams,
    PageData,
    ParserContext,
    PageAnnotations,
    PropertyPath,
    Location,
    UINode
} from './types';
import { AggregationType } from './types';

import { FieldsAggregation, ConnectedFieldsAggregation } from './fields';
import { isArrayEndsWith, getMatchingNode } from './utils';
import { ActionsAggregation } from './actions';
import i18next from 'i18next';
import { FilterFieldsAggregation } from './filter-fields';
import { VisualFiltersAggregation } from './visual-filters';
import { SectionAggregation, HeaderSectionsAggregation, SubSectionsAggregation } from './sections';
import { ToolbarAggregation } from './table/ToolbarAggregation';
import { RootAggregation } from './RootAggregation';
import { ChartAggregation } from './chart/ChartAggregation';
import { ViewsAggregation, ViewAggregation } from './views';
import { MacrosRootAggregation } from './macros/MacrosRoot';
import { AdditionalObjectsAggregation } from './additionalObjects';
import { SectionsObjectAggregation } from './sections/SectionsObjectAggregation';
import { isTooComplex } from '../annotations';

const JSON_SCHEMA_TYPE_ARRAY = 'array';
const JSON_SCHEMA_TYPE_OBJECT = 'object';

const MACROS_TABLE_DEFINITION_NAME = 'sap.fe.macros.Table';

const TABLE_PATHS = [
    ['table', 'quickVariantSelection', 'variants'],
    ['table', 'quickVariantSelectionX', 'variants']
];

type AggregationConditionFunction = (
    path: string,
    parentAggregation?: ObjectAggregation,
    schema?: JSONSchema4
) => boolean;

interface AggregationCondition {
    aggregation: typeof ObjectAggregation;
    fn: AggregationConditionFunction;
}

const isTableNode = (name: string, path: string, parentAggregation?: ObjectAggregation): boolean => {
    let parent = parentAggregation;
    const loops = name.split('/').length - 1;
    let i = 0;
    while (i < loops) {
        parent = parent?.parent;
        i++;
    }
    return path.endsWith(`table/${name}`) || (parent instanceof ViewAggregation && path.endsWith(`/${name}`));
};

const isCustomSectionAction = (path: string, parentAggregation?: ObjectAggregation, schema?: JSONSchema4): boolean => {
    const additionalProperties = schema?.additionalProperties as JSONSchema4;
    const hasCustomSectionActionRef = additionalProperties?.$ref?.includes('CustomSectionActionOP');
    return (
        !!hasCustomSectionActionRef && !!parentAggregation?.name && path.endsWith(`${parentAggregation.name}/actions`)
    );
};

/**
 * Method checks if passed aggregation instance of passed macros control name.
 *
 * @param controlName SAPUI5 macros control name.
 * @param aggregation Aggregation object.
 * @returns Is passed aggregation instance of passed SAPUI5 control.
 */
const isInstanceOfUI5Control = (controlName: string, aggregation?: ObjectAggregation): boolean => {
    return aggregation?.schema?.metadata?.controlName === controlName;
};

/**
 * Method checks if passed schema is instance of passed macros control name.
 *
 * @param controlName SAPUI5 macros control name.
 * @param schema Schema node to check.
 * @returns Is passed aggregation instance of passed SAPUI5 control.
 */
const isSchemaOfUI5Control = (controlName: string, schema?: JSONSchema4): boolean => {
    return schema?.metadata?.controlName === controlName;
};

const isSupportedUI5Aggregation = (controlName: string, schema?: JSONSchema4): boolean => {
    const additionalProperties = schema?.additionalProperties;
    return (
        schema?.metadata?.type === 'Aggregation' &&
        typeof additionalProperties === 'object' &&
        additionalProperties.$ref === `#/definitions/${controlName}`
    );
};

// Array of type specific aggregation resolution depending on path and context
const AGGREGATIONS_CONDITIONS: Array<AggregationCondition> = [
    {
        aggregation: SectionsObjectAggregation,
        fn: (path: string, parentAggregation?: ObjectAggregation, schema?: JSONSchema4): boolean => {
            const additionalProperties = schema?.additionalProperties as JSONSchema4;
            const hasCustomSectionsRef = additionalProperties?.$ref?.includes('ObjectPageCustomSectionFragment');
            return path === 'sections' && !!hasCustomSectionsRef;
        }
    },
    {
        aggregation: SectionsAggregation,
        fn: (path: string): boolean => path === 'sections'
    },
    {
        aggregation: ColumnsAggregation,
        fn: (path: string, parentAggregation?: ObjectAggregation, schema?: JSONSchema4): boolean =>
            isTableNode('columns', path, parentAggregation) ||
            (isSupportedUI5Aggregation('sap.fe.macros.table.Column', schema) &&
                isInstanceOfUI5Control(MACROS_TABLE_DEFINITION_NAME, parentAggregation))
    },
    {
        aggregation: ToolbarAggregation,
        fn: (path: string, parentAggregation?: ObjectAggregation): boolean =>
            isTableNode('toolBar', path, parentAggregation)
    },
    {
        aggregation: FieldsAggregation,
        fn: (path: string): boolean => path.endsWith('form/fields')
    },
    {
        aggregation: AdditionalObjectsAggregation,
        fn: (path: string): boolean => path.endsWith('actions/RelatedApps/additionalSemanticObjects')
    },
    {
        aggregation: ConnectedFieldsAggregation,
        fn: (path: string, parentAggregation?: ObjectAggregation, schema?: JSONSchema4): boolean =>
            schema?.dataType === 'ConnectedFields'
    },
    {
        aggregation: ActionsAggregation,
        fn: (path: string, parentAggregation?: ObjectAggregation, schema?: JSONSchema4): boolean =>
            isCustomSectionAction(path, parentAggregation, schema) ||
            ['form/actions', 'header/actions', 'footer/actions'].some((entry) => path.endsWith(entry)) ||
            isTableNode('toolBar/actions', path, parentAggregation) ||
            (isSupportedUI5Aggregation('sap.fe.macros.table.Action', schema) &&
                isInstanceOfUI5Control(MACROS_TABLE_DEFINITION_NAME, parentAggregation))
    },
    {
        aggregation: FilterFieldsAggregation,
        fn: (path: string, parentAggregation?: ObjectAggregation): boolean =>
            path.endsWith('filterBar/selectionFields') ||
            (path.endsWith('/filterFields') && isInstanceOfUI5Control('sap.fe.macros.FilterBar', parentAggregation))
    },
    {
        aggregation: VisualFiltersAggregation,
        fn: (path: string): boolean => path.endsWith('filterBar/visualFilters')
    },
    {
        aggregation: TableAggregation,
        fn: (path: string, parentAggregation?: ObjectAggregation, schema?: JSONSchema4): boolean =>
            path === 'table' ||
            (path.endsWith('/table') && parentAggregation instanceof SectionAggregation) ||
            isSchemaOfUI5Control(MACROS_TABLE_DEFINITION_NAME, schema)
    },
    {
        aggregation: HeaderSectionsAggregation,
        fn: (path: string): boolean => path.endsWith('header/sections')
    },
    {
        aggregation: RootAggregation,
        fn: (path: string): boolean => path === ''
    },
    {
        aggregation: ChartAggregation,
        fn: (path: string): boolean => path === 'chart'
    },
    {
        aggregation: ViewsAggregation,
        fn: (path: string): boolean => path.endsWith('table/views')
    },
    {
        aggregation: SubSectionsAggregation,
        fn: (path: string, parentAggregation?: ObjectAggregation): boolean =>
            path.endsWith('/subsections') && parentAggregation instanceof SectionAggregation
    }
];

interface SchemaParseParams {
    aggregation: ObjectAggregation;
    currentNode: JSONSchema4;
    currentAnnotationNode: UINode | undefined;
    name: string | undefined;
    path: PropertyPath;
    context: ParserContext;
}
type SchemaParserMethod = (params: SchemaParseParams) => boolean;
type SchemaReferenceProperties = '$ref' | 'anyOf' | 'properties' | 'items';
type SchemaReferenceParsers = Map<SchemaReferenceProperties, SchemaParserMethod>;

// Schema properties which should be taken from deeper level as priority
// It is for case when one node have multiple $ref levels and multiple same 'property' keys persists,
// then default behavior is that most top properties have higher priority, but for some cases we need take it from deeper level.
const SCHEMA_DEEP_LEVEL_PROPS = ['annotationPath'];

/**
 * Page/application schema parsing model.
 * `PageEditModel` is responsible for:
 * - Holding metadata about a page (type, schema, annotations, etc.).
 * - Storing both current (`data`) and original (`originalData`) page definitions.
 * - Managing the root aggregation tree (`root`) for further parsing and validation.
 * - Supporting schema traversal, validation, and exclusion rules.
 */
export class PageEditModel {
    public name: string;
    public pageType: PageType;
    public root: ObjectAggregation = this.prepareAggregation();
    // Page data - object contains latest page values
    public data: PageConfig & { $filePath?: string };
    public originalData: { page: PageConfig; schema: string; annotations: PageAnnotations };
    // Definitions - used to look up when going through recursion
    public readonly definitions: { [key: string]: JSONSchema4 } = {};
    // List of properties to exclude from traversing
    private excludeProperties: string[] = ['$schema'];
    public schema: JSONSchema4;
    public validator: AggregationValidator = new AggregationValidator();
    public pendingNodes: ObjectAggregation[] = [];
    public contextPathOrEntitySet?: string;

    /**
     *
     * @param name
     * @param pageType
     * @param page
     * @param schema
     * @param annotations
     * @param contextPathOrEntitySet
     */
    constructor(
        name: string,
        pageType: PageType,
        page: PageConfig,
        schema: string,
        annotations: PageAnnotations,
        contextPathOrEntitySet?: string
    ) {
        this.name = name;
        this.pageType = pageType;
        this.data = page;
        this.originalData = {
            page: JSON.parse(JSON.stringify(this.data)),
            annotations,
            schema
        };
        this.contextPathOrEntitySet = contextPathOrEntitySet;
        this.schema = JSON.parse(schema);
        this.init(annotations);
    }

    /**
     * Initialize model data - parse schema and current page object values.
     *
     * @param annotations Page annotations.
     */
    private init(annotations: PageAnnotations): void {
        // Store definitions with full path
        if (this.schema.definitions) {
            for (const name in this.schema.definitions) {
                this.definitions[`#/definitions/${name}`] = this.schema.definitions[name];
            }
        }
        // Populate tree
        const schema = JSON.parse(this.originalData.schema);
        this.root = this.prepareAggregation(undefined, {
            properties: schema.properties
        });
        this.parseSchema(this.root, schema, { subnodes: annotations.nodes } as UINode, undefined, [], {
            filePath: this.data.$filePath
        });
        // Populate additional/customized aggregations/sections
        this.readAdvancedPropertiesData(this.root, this.data as PageData);
        const parser: ModelParserParams<ObjectAggregation> = {
            definitions: this.schema.definitions as { [key: string]: JSONSchema4 },
            parse: this.parseSchema.bind(this),
            annotations
        };
        // Populate values
        this.root.updatePropertiesValues(this.data as PageData, this.data, this.pageType, [], annotations, parser);
        // Validate data
        this.validator.validate(this.root, this.data as PageData);
        // Update view nodes
        this.updateViewNodes(this.root);
        this.pendingNodes = [];
        // Post model initialization
        this.afterInit(annotations);
    }

    /**
     *
     * @param name
     * @param aggregation
     * @param currentNode
     */
    private updatePropertyFromSchema(name: string, aggregation: ObjectAggregation, currentNode: JSONSchema4) {
        if (!(name in aggregation.properties)) {
            // Simple property
            aggregation.properties[name] = aggregation.addProperty(name, currentNode);
            aggregation.properties[name].freeText = this.isFreeText(currentNode);
        } else if (currentNode.enum) {
            // Enum property - merge values from various variations
            let enumEntries = aggregation.properties[name].schema.enum;
            // Merge enum entries
            enumEntries = enumEntries ? enumEntries.concat(currentNode.enum) : currentNode.enum;
            // Unique enum entries
            aggregation.properties[name].schema.enum = enumEntries
                ? enumEntries.filter((item, pos) => enumEntries && enumEntries.indexOf(item) === pos)
                : [];
        }
    }

    /**
     * Method returns context of passed macros node ID used in getMatchingNode.
     *
     * @param currentMacrosNodeId Current macros node id.
     * @param annotationNodes All annotation nodes.
     * @returns Matched node context.
     */
    private getContextForMacrosNode = (currentMacrosNodeId: string, annotationNodes: UINode[]): UINode | undefined => {
        for (const i in annotationNodes) {
            const contextNode = annotationNodes[i];
            const subNodes = 'subnodes' in contextNode ? contextNode.subnodes : [];
            for (const j in subNodes) {
                if (subNodes[j].macroNodeId === currentMacrosNodeId) {
                    return contextNode;
                }
            }
        }
        return undefined;
    };

    // Separated and ordered schema parse methods
    private readonly schemaParsers: Array<(params: SchemaParseParams) => boolean> = [
        // Prehandle schema - check for "const" property and create "enum" if it is missing in schema
        (params: SchemaParseParams): boolean => {
            // Apply single enum in case if there is "const" defined - it should enable handling for dropdown/combobox
            if (params.currentNode.const && !params.currentNode.enum) {
                params.currentNode.enum = [params.currentNode.const];
            }
            return true;
        },
        // Validate schema node
        (params: SchemaParseParams): boolean => {
            const { currentNode } = params;
            // eslint-disable-next-line sonarjs/prefer-single-boolean-return
            if (currentNode.hidden) {
                return false;
            }
            return true;
        },
        // Create property or aggregation objects
        (params: SchemaParseParams): boolean => {
            const { currentNode, name } = params;
            if (name === undefined) {
                // Aggregation or property should not be created but continue parse schema
                return true;
            }
            if (this.isAggregation(currentNode)) {
                params.path = params.path.concat([
                    params.aggregation.type === AggregationType.Array ? parseInt(name, 10) : name
                ]);
                const displayName = currentNode.displayName || name;
                const type =
                    currentNode.type === JSON_SCHEMA_TYPE_OBJECT ? AggregationType.Object : AggregationType.Array;
                params.aggregation = params.aggregation.addAggregation(
                    displayName,
                    params.aggregation.aggregations[displayName] ||
                        this.prepareAggregation(params.path, currentNode, params.aggregation, type),
                    params.path
                );
                if (params.aggregation.type === AggregationType.Array) {
                    // Creation form schema data
                    params.aggregation.schema = currentNode;
                    this.updateFormSchema(params.aggregation);
                    this.copySchemaProperties(params.aggregation, currentNode, name);
                    // Do not continue parsing - arrays will be handled when data will be presented
                    return false;
                }
            } else if (this.isProperty(currentNode)) {
                this.updatePropertyFromSchema(name, params.aggregation, currentNode);
            }

            return true;
        },
        // Add annotation node if one exists
        (params: SchemaParseParams): boolean => {
            const { aggregation, currentNode } = params;
            let currentAnnotationNode = params.currentAnnotationNode;
            if (aggregation instanceof MacrosRootAggregation) {
                currentAnnotationNode = this.originalData.annotations.nodes.find((node: UINode) => {
                    return 'nodeType' in node && node.nodeType === 'macros';
                });
                aggregation.annotationNodeId = currentAnnotationNode?.nodeId;
            }
            if (currentNode.metadata?.internalId && !currentAnnotationNode) {
                let availableNodes = this.originalData.annotations.nodes;
                availableNodes = availableNodes.filter((node: UINode) => {
                    return 'nodeType' in node && node.nodeType === 'macros';
                });
                currentAnnotationNode = params.currentAnnotationNode = this.getContextForMacrosNode(
                    currentNode.metadata.internalId,
                    availableNodes
                );
            }
            // Add annotation if one exists
            if (!currentNode.$ref && currentNode.annotationPath) {
                // $ref nodes are processed later, so we need to skip them
                let annotationNodes: UINode[] = [];
                if (currentAnnotationNode && !isTooComplex(currentAnnotationNode)) {
                    annotationNodes = currentAnnotationNode.subnodes;
                }
                const matchedNode = getMatchingNode(
                    currentNode.annotationPath,
                    this.originalData.annotations.nodes,
                    annotationNodes,
                    currentAnnotationNode?.annotationPath,
                    aggregation.order
                );
                if (matchedNode) {
                    params.currentAnnotationNode = matchedNode;
                    aggregation.annotationNodeId = matchedNode.nodeId;
                }
            }
            return true;
        },
        // Handle schema references with recursion
        (params: SchemaParseParams): boolean => {
            for (const entry of Array.from(this.schemaReferenceParsers)) {
                if (entry[1](params)) {
                    break;
                }
            }
            return true;
        },
        // Handle some simple properties from schema definition - we need copy them as they can be defined in multiple places inside of schema object like:
        (params: SchemaParseParams): boolean => {
            const { aggregation, currentNode, name } = params;
            this.copySchemaProperties(aggregation, currentNode, name);
            return true;
        },
        // Handle additional properties
        (params: SchemaParseParams): boolean => {
            const { aggregation, currentNode, currentAnnotationNode, name, path, context } = params;
            if (typeof currentNode.additionalProperties === 'object') {
                // Probably there would be other cases
                aggregation.additionalProperties = this.prepareAggregation();
                this.parseSchema(
                    aggregation.additionalProperties,
                    currentNode.additionalProperties,
                    currentAnnotationNode,
                    name,
                    path,
                    context
                );
                if (this.isSchemaAtomic(currentNode.additionalProperties)) {
                    this.updateFormSchema(aggregation, name);
                }
            }
            return true;
        },
        // Handle "patternProperties"
        (params: SchemaParseParams): boolean => {
            const { aggregation, currentNode, currentAnnotationNode, name, path, context } = params;
            if (typeof currentNode.patternProperties === 'object') {
                // Adapted to current schema, but in thery it could be more complex scenario
                aggregation.pattern = Object.keys(currentNode.patternProperties)[0];
                currentNode.additionalProperties = currentNode.patternProperties[aggregation.pattern];
                // Probably there would be other cases
                aggregation.additionalProperties = this.prepareAggregation();
                this.parseSchema(
                    aggregation.additionalProperties,
                    currentNode.patternProperties[aggregation.pattern],
                    currentAnnotationNode,
                    name,
                    path,
                    context
                );
                // Creation form schema data
                this.updateFormSchema(aggregation, name);
            }
            return true;
        },
        // Handle "required" properties
        (params: SchemaParseParams): boolean => {
            const { aggregation, currentNode } = params;
            if (currentNode.required) {
                for (const name of currentNode.required) {
                    const property = aggregation.properties[name];
                    if (property) {
                        property.required = true;
                    }
                }
            }
            return true;
        },
        // Handle union types
        (params: SchemaParseParams): boolean => {
            const { aggregation, currentNode, name } = params;
            if (currentNode.displayName && name && currentNode.type === 'object') {
                aggregation.addUnionName(currentNode.displayName, name);
            }
            return true;
        },
        // Handle "metadata" properties - currently used for building blocks
        (params: SchemaParseParams): boolean => {
            const { name = '', aggregation, currentNode, context } = params;
            const { metadata } = currentNode;
            const property = aggregation.properties[name];
            if (context.filePath && metadata) {
                const { position } = metadata;
                const locations: Location[] = [];
                if (position) {
                    locations.push({
                        fileUri: join(DirName.Webapp, context.filePath),
                        range: {
                            start: {
                                line: position.startLine - 1,
                                character: position.startColumn - 1
                            },
                            end: {
                                line: position.endLine - 1,
                                character: position.endColumn
                            }
                        },
                        relative: true,
                        type: ArtifactType.XMLProperty
                    });
                }
                if (property) {
                    property.locations = locations;
                } else if (aggregation.name === name) {
                    aggregation.locations = locations;
                }
            }
            return true;
        },
        // Handle addable tables
        (params: SchemaParseParams): boolean => {
            const { path, name = '', aggregation } = params;
            if (path && TABLE_PATHS.some((targetPath: PropertyPath) => isArrayEndsWith(path, targetPath))) {
                // Creation form schema data
                this.updateFormSchema(aggregation, name);
            }
            return true;
        }
    ];

    // Map to handle reference properties of single schema definition
    // Currently supported - '$ref', 'anyOf', 'properties', 'items'
    private readonly schemaReferenceParsers: SchemaReferenceParsers = new Map([
        [
            '$ref',
            (params: SchemaParseParams): boolean => {
                const { aggregation, currentNode, currentAnnotationNode, name, path, context } = params;
                if (!currentNode.$ref) {
                    return false;
                }
                const data = this.definitions[currentNode.$ref] ? { ...this.definitions[currentNode.$ref] } : {};
                for (const key of Object.keys(currentNode)) {
                    const isDeepLevelProp = SCHEMA_DEEP_LEVEL_PROPS.includes(key);
                    if (key !== '$ref' && !(isDeepLevelProp && data[key])) {
                        data[key] = currentNode[key];
                    }
                }
                this.parseSchema(aggregation, data, currentAnnotationNode, name, path, context);
                return true;
            }
        ],
        [
            'anyOf',
            (params: SchemaParseParams): boolean => {
                const { aggregation, currentNode, currentAnnotationNode, name, path, context } = params;
                if (!currentNode.anyOf) {
                    return false;
                }
                for (const anyProperty of currentNode.anyOf) {
                    this.parseSchema(aggregation, anyProperty, currentAnnotationNode, name, path, context);
                }
                // Create properties variations for 'anyOf'
                // Any of as array or object
                if (
                    Object.keys(currentNode.anyOf).length > 1 ||
                    (Array.isArray(currentNode.anyOf) && currentNode.anyOf.length > 1)
                ) {
                    this.createAnyOfPropertiesVariations(currentNode.anyOf, params);
                }
                return true;
            }
        ],
        [
            'properties',
            (params: SchemaParseParams): boolean => {
                const { aggregation, currentNode, currentAnnotationNode, path, context } = params;
                if (!currentNode.properties) {
                    return false;
                }
                const propertyNames = Object.keys(currentNode.properties).filter(
                    (prop) => !this.excludeProperties.includes(prop)
                );
                const properties = currentNode.properties;
                const hasPropertyIndex = propertyNames.some(
                    (propertyName: string) =>
                        currentNode.properties && currentNode.properties[propertyName]?.['propertyIndex'] !== undefined
                );
                if (properties && propertyNames.length && hasPropertyIndex) {
                    // Sort properties - if schema have mark
                    propertyNames.sort(this.propertySorter.bind(this, properties));
                }
                for (const property of propertyNames) {
                    this.parseSchema(
                        aggregation,
                        currentNode.properties[property],
                        currentAnnotationNode,
                        property,
                        path,
                        context
                    );
                }
                return true;
            }
        ],
        [
            'items',
            (params: SchemaParseParams): boolean => {
                const { aggregation, currentNode, currentAnnotationNode, path, context } = params;
                if (!currentNode.items) {
                    return false;
                }
                if (Array.isArray(currentNode.items)) {
                    // Maybe something different, when we will have more examples - currently adapted for available scenarios
                    // It can be enhanced with additional logic, but wait for more real examples
                    for (let i = 0; i < currentNode.items.length; i++) {
                        this.parseSchema(
                            aggregation,
                            currentNode.items[i],
                            currentAnnotationNode,
                            i.toString(),
                            path,
                            context
                        );
                    }
                } else {
                    this.parseSchema(aggregation, currentNode.items, currentAnnotationNode, undefined, path, context);
                }
                return true;
            }
        ]
    ]);

    /**
     * Method creates properties variants by handling array "anyOf" schema property.
     *
     * @param anyOf Array value of "anyOf" schema property.
     * @param params Schema parse params.
     */
    private createAnyOfPropertiesVariations(anyOf: JSONSchema4[], params: SchemaParseParams) {
        const { aggregation, currentAnnotationNode, name, path, context } = params;
        for (const anyProperty of anyOf) {
            let tempAggregation = this.prepareAggregation();
            this.parseSchema(tempAggregation, anyProperty, currentAnnotationNode, name, path, context);
            let displayName = name;
            if (name && !tempAggregation.aggregations[name]) {
                const aggregationKeys = Object.keys(tempAggregation.aggregations);
                displayName = aggregationKeys.length > 0 ? aggregationKeys[0] : name;
            }
            let anyAggregation = aggregation;
            if (displayName) {
                anyAggregation = aggregation.aggregations[displayName];
                tempAggregation = tempAggregation.aggregations[displayName];
            }
            if (tempAggregation && anyAggregation) {
                anyAggregation.variants.push({
                    aggregations: tempAggregation.aggregations,
                    properties: tempAggregation.properties
                });
            }
        }
        // Check for free text
        if (name && aggregation.properties[name]) {
            aggregation.properties[name].freeText = this.isFreeText(anyOf);
        }
    }

    /**
     * Method uses recursion to parse schema and populate model with aggregations and properties for tree structure.
     *
     * @param aggregation Current aggregation.
     * @param currentNode Current schema node.
     * @param currentAnnotationNode Current annotation node.
     * @param name Name of aggregation.
     * @param path Array containing path to current aggregation.
     * @param context Object containing Parser context.
     */
    private parseSchema(
        aggregation: ObjectAggregation,
        currentNode: JSONSchema4,
        currentAnnotationNode: UINode | undefined,
        name: string | undefined,
        path: PropertyPath,
        context: ParserContext
    ): void {
        const params = {
            aggregation,
            currentNode,
            currentAnnotationNode,
            name,
            path,
            context
        };
        for (const parse of this.schemaParsers) {
            const continueParsing = parse.call(this, params);
            if (!continueParsing) {
                break;
            }
        }
    }

    /**
     * Handle and copy some simple properties from schema definition - we need copy them as they can be defined in multiple places inside of schema object like:
     * 1. Outside of reference. Example - "name": { "$ref": "....", "description": "..." }
     * 2. Inside of reference.
     *
     * @param aggregation Current aggregation.
     * @param currentNode Current schema node.
     * @param name Name of aggregation.
     */
    private copySchemaProperties(
        aggregation: ObjectAggregation,
        currentNode: JSONSchema4,
        name: string | undefined
    ): void {
        if (name) {
            if (aggregation.properties[name]) {
                this.storeInnerProperties(
                    aggregation.properties[name],
                    [
                        'pattern',
                        'description',
                        'i18nClassification',
                        'artifactType',
                        'minimum',
                        'displayName',
                        'messages'
                    ],
                    currentNode
                );
            } else {
                const targetAggregation = aggregation.aggregations[name] || aggregation;
                this.storeInnerProperties(
                    targetAggregation,
                    ['description', 'isViewNode', 'artifactType', 'messages'],
                    currentNode
                );
            }
        }
    }

    /**
     * Method checs is json schema node should be used for property.
     *
     * @param schema Schema node to check.
     * @returns Schema node should be used for property.
     */
    private isProperty(schema: JSONSchema4): boolean {
        return !schema.$ref && schema.type !== 'object' && schema.type !== 'array' && !schema.anyOf;
    }

    /**
     * Method checs is json schema node should be used for aggregation.
     *
     * @param schema Schema node to check.
     * @returns Schema node should be used for aggregation.
     */
    private isAggregation(schema: JSONSchema4): boolean {
        return (schema.type === JSON_SCHEMA_TYPE_OBJECT || schema.type === JSON_SCHEMA_TYPE_ARRAY) && !schema.$ref;
    }

    /**
     * Method uses recursion to populate aggregations/properties of aggregation by looping through 'additionalProperties' from schema.
     *
     * @param aggregation ObjectAggregation which would be populated.
     * @param data Page data - object contains latest page values.
     */
    readAdvancedPropertiesData(aggregation: ObjectAggregation, data: PageData): void {
        const propertyKeys = Object.keys(aggregation.properties);
        const aggregationKeys = Object.keys(aggregation.aggregations);
        const keys = propertyKeys.concat(aggregationKeys);
        for (const name in data) {
            if (keys.includes(name) || !aggregation.additionalProperties || !aggregation.schema) {
                continue;
            }
            const additionalProperties = aggregation.schema.additionalProperties || aggregation.schema.additionalItems;
            if (typeof additionalProperties === 'object') {
                this.parseSchema(aggregation, additionalProperties, undefined, name, aggregation.path, {});
                const childAggregation = aggregation.aggregations[name];
                if (childAggregation && childAggregation.isViewNode && childAggregation.description) {
                    // Description for view nodes is used as display name
                    // In case of 'additionalProperties'
                    //  - they are used for dynamic aggregations and we should use object key instead of static description from reference schema
                    // Just remove description and fallback case will do rest
                    delete childAggregation.description;
                }
            }
        }
        // Array handling
        if (aggregation && aggregation.type === AggregationType.Array && aggregation.schema) {
            const currentNode = aggregation.schema;
            const item = this.getSchemaArrayItem(currentNode);
            if (item && Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    this.parseSchema(aggregation, item, undefined, i.toString(), aggregation.path, {});
                }
            }
        }
        // Go through standard aggregation with recursion
        for (const rootName in aggregation.aggregations) {
            const names = aggregation.aggregations[rootName].union?.originalNames || [rootName];
            for (const name of names) {
                if (name in data) {
                    this.readAdvancedPropertiesData(aggregation.aggregations[rootName], data[name] as PageData);
                }
            }
        }
    }

    /**
     * Method uses recursion to populate 'aggregation' with values from page object.
     *
     * @param aggregation ObjectAggregation which would be populated.
     * @param data Page data - object contains latest page values.
     */
    readPropertiesData(aggregation: ObjectAggregation, data: PageData): void {
        const propertyKeys = Object.keys(aggregation.properties);
        for (const name in data) {
            if (propertyKeys.includes(name)) {
                aggregation.properties[name].value = data[name];
            }
        }
        // Go with recursion
        for (const name in aggregation.aggregations) {
            if (name in data) {
                this.readPropertiesData(aggregation.aggregations[name], data[name] as PageData);
            }
        }
    }

    /**
     * Method prepares simple aggregation object.
     *
     * @param path Path for aggregation.
     * @param schema Schema segment for new aggregation.
     * @param parentAggregation Parent aggregation.
     * @param type Aggregation type.
     * @returns Predefined aggregation object.
     */
    prepareAggregation(
        path?: PropertyPath,
        schema?: JSONSchema4,
        parentAggregation?: ObjectAggregation,
        type = AggregationType.Object
    ): ObjectAggregation {
        const fullPath = (path || []).join('/');
        // Check paths for non generic aggregations
        for (const aggregationCondition of AGGREGATIONS_CONDITIONS) {
            if (aggregationCondition.fn(fullPath, parentAggregation, schema)) {
                return new aggregationCondition.aggregation(undefined, schema);
            }
        }
        // Use parent aggregation to create child
        let aggregation;
        if (parentAggregation?.childClass) {
            aggregation = new parentAggregation.childClass(undefined, schema);
        } else {
            // Default generic aggregation
            const aggregationClass = type === AggregationType.Object ? ObjectAggregation : ArrayAggregation;
            aggregation = new aggregationClass(undefined, schema);
        }
        // Check additional properties
        if (path && TABLE_PATHS.some((targetPath: PropertyPath) => isArrayEndsWith(path, targetPath))) {
            aggregation.isTable = true;
        }
        return aggregation;
    }

    /**
     * Method to check if free text entry should be enabled for property.
     *
     * @param schema Schema node to check.
     * @returns Free text entry allowed.
     */
    private isFreeText(schema: JSONSchema4[] | JSONSchema4): boolean {
        const validate = (node: JSONSchema4) => {
            return node.type === 'string' && !node.enum;
        };
        return Array.isArray(schema) ? schema.some(validate) : validate(schema);
    }

    /**
     * Generic method receives array of properties and copies received properties from 'currentNode' into target 'obj'.
     *
     * @param targetObj Target object for store.
     * @param props Properties name to copy from 'currentNode' into 'targetObj'.
     * @param currentNode JSON Schema node.
     */
    private storeInnerProperties<T>(
        targetObj: T,
        props: Array<keyof T & keyof JSONSchema4>,
        currentNode: JSONSchema4
    ): void {
        for (const property of props) {
            if (currentNode[property] !== undefined || (property === 'i18nClassification' && property in currentNode)) {
                if (!this.isCorrectSchemaProperty(property, currentNode[property])) {
                    // schema property is not correct - throw error and do not store value, because it can give unpredictable behavior
                    console.error(
                        i18next.t('SCHEMA_PARSING_ERROR_UNEXPECTED_VALUE', {
                            name: property,
                            value: JSON.stringify(currentNode[property])
                        })
                    );
                    return;
                }
                targetObj[property] = currentNode[property];
            }
        }
    }

    /**
     * Method returns schema item definition for array schema resolution.
     *
     * @param currentNode Current schema node.
     * @returns Array's schema definition or undefined if it does not exist.
     */
    private getSchemaArrayItem(currentNode: JSONSchema4): JSONSchema4 | undefined {
        const item = !Array.isArray(currentNode.items) ? currentNode.items : currentNode.additionalItems;
        return typeof item === 'object' ? item : undefined;
    }

    /**
     * Method updates 'formSchema' property for array aggregation.
     *
     * @param aggregation Aggregation to handle.
     */
    private updateArrayFormSchema(aggregation: ObjectAggregation): void {
        // Creation form currently supported by arrays
        const item = this.getSchemaArrayItem(aggregation.schema || {});
        if (typeof item === 'object') {
            const formSchema = this.prepareAggregation();
            aggregation.isAtomic = !item.type ? false : true;
            this.parseSchema(formSchema, item, undefined, aggregation.isAtomic ? '' : undefined, aggregation.path, {});
            if (Object.keys(formSchema.properties).length) {
                aggregation.formSchema = formSchema;
            }
        }
        if (!aggregation.formSchema || !Object.keys(aggregation.formSchema.properties).length) {
            // Array is not appendable
            aggregation.schemaCreationForms = [];
        }
    }

    /**
     * Method updates aggregation 'formSchema' property with schema object which will represent creation form.
     *
     * @param aggregation Aggregation to handle.
     * @param name Aggregation name in 'additionalProperties'.
     */
    private updateFormSchema(aggregation: ObjectAggregation, name?: string): void {
        if (aggregation instanceof ArrayAggregation) {
            this.updateArrayFormSchema(aggregation);
        } else if (name && aggregation.additionalProperties?.aggregations[name]) {
            const formSchema = this.prepareAggregation();
            this.parseSchema(
                formSchema,
                aggregation.additionalProperties.aggregations[name].schema || {},
                undefined,
                undefined,
                aggregation.path,
                {}
            );
            if (Object.keys(formSchema.properties).length) {
                aggregation.formSchema = formSchema;
            }
        } else if (
            typeof aggregation.schema?.additionalProperties === 'object' &&
            this.isSchemaAtomic(aggregation.schema?.additionalProperties)
        ) {
            aggregation.isAtomic = true;
            aggregation.isTable = true;
            const formSchema = this.prepareAggregation();
            this.parseSchema(formSchema, aggregation.schema.additionalProperties, undefined, '', aggregation.path, {});
            if (Object.keys(formSchema.properties).length) {
                aggregation.formSchema = formSchema;
            }
        }
    }

    /**
     * Method goes with recursion and marks all visible nodes for outline.
     *
     * @param aggregation Aggregation object.
     * @returns Returns visbility of aggregation.
     */
    private updateViewNodes(aggregation: ObjectAggregation): boolean {
        for (const name in aggregation.aggregations) {
            const childAggregation = aggregation.aggregations[name];
            const isViewNode = this.updateViewNodes(childAggregation);
            if (isViewNode && !aggregation.isViewNode) {
                aggregation.isViewNode = true;
            }
        }
        return aggregation.isViewNode || false;
    }

    /**
     * Method validates property from JSON schema.
     * That method helps to avoid issues, when we are receiving incorrect schema.
     *
     * @param name Schema property name.
     * @param value Value of schema property.
     * @returns Is schema property valid.
     */
    private isCorrectSchemaProperty(name: keyof JSONSchema4, value: unknown): boolean {
        let valid = true;
        switch (name) {
            case 'description':
            case 'pattern':
            case 'i18nClassification': {
                // Optional string - otherwise unexpected value
                valid = value === undefined || typeof value === 'string';
                break;
            }
            case 'isViewNode': {
                // Optional boolean - otherwise unexpected value
                valid = value === undefined || typeof value === 'boolean';
                break;
            }
        }
        return valid;
    }

    /**
     * Method to sort schema properties.
     * Spec provides custom property 'propertyIndex', which should be used for sorting.
     *
     * @param properties Object with properties.
     * @param name1 First property name.
     * @param name2 Second property name.
     * @returns Sort result.
     */
    private propertySorter(properties: { [k: string]: JSONSchema4 }, name1: string, name2: string): number {
        const order1 = properties[name1].propertyIndex !== undefined ? properties[name1].propertyIndex : 0;
        const order2 = properties[name2].propertyIndex !== undefined ? properties[name2].propertyIndex : 0;
        if (order1 === order2) {
            return 0;
        }
        return order1 > order2 ? 1 : -1;
    }

    /**
     * Method handles post initialization.
     * Currently it is used for FPM custom pages to add additional root 'macros' node.
     *
     * @param annotations Page annotations.
     */
    private afterInit(annotations: PageAnnotations): void {
        if (this.pageType === PageType.FPMCustomPage) {
            const macros = new MacrosRootAggregation(undefined, undefined);
            // set file path
            if (typeof this.data.$filePath === 'string') {
                macros.setFilePath(this.data.$filePath);
                macros.annotationNodeId = annotations.nodes[0]?.nodeId;
            }
            macros.aggregations = this.root.aggregations;
            this.root.aggregations = {
                macros
            };
        }
    }

    /**
     * Method checks if passed schema is atomic type.
     * Atomic means that schema expects simple value as "string", "number" or "boolean".
     *
     * @param schema Schema to check.
     * @returns True if passed schema should be considered as atomic.
     */
    private isSchemaAtomic(schema?: boolean | JSONSchema4): boolean {
        const atomicTypes = ['string', 'number', 'boolean'];
        return typeof schema === 'object' && typeof schema.type === 'string' && atomicTypes.includes(schema.type);
    }
}
