import type { ArtifactType, PageConfig } from '@sap/ux-specification/dist/types/src';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import type { AllowedMoveRange, ObjectAggregation, PageAnnotations, PropertyPath, SettingOption } from './model';
import {
    isArrayEqual,
    PageEditModel,
    SectionAggregation,
    AggregationNodeType,
    ActionAggregation,
    ColumnAggregation,
    FilterFieldAggregation,
    ViewsAggregation,
    RootAggregation,
    SortingOptions,
    DATA_FIELD_FOR_INTENT_BASED_NAVIGATION,
    DATA_FIELD_FOR_ACTION_GROUP
} from './model';
import type { JSONSchema4, JSONSchema4Type } from 'json-schema';

interface TraverseNodeData {
    text: string;
    level: number;
    path: string;
    model: PageEditModel;
}

export interface TreeNode {
    path: PropertyPath;
    text: string;
    /**
     * Property to set tooltip to node. If title is not passed then value of "text" will be applied as tooltip.
     */
    title?: string;
    children: TreeNode[];
    root?: boolean;
    // Location in file
    locations?: Location[];
    // Node id in DOM
    id?: string;
    // Node will not be displayed in tree
    hidden?: boolean;
    // icon?: UiIcons;
    additionalText?: string;
    // Drag and drop properties
    moveProps?: NodeMoveProps;
    properties: TreeNodeProperty[];
    // Annotation node id
    annotationNodeId?: number[];
    // Special node type
    type?: AggregationNodeType;
    value?: unknown;
}

/**
 * Use cases:
 * 1. Drag enabled - drop validity are checked bassed on allowedParents or allowedChildTypes;
 * Properties should be used "movable" + ("allowedParents" or ("type" + "allowedChildTypes")
 * 2. Drag disabled - move buttons are hidden
 * movable = false and moveBtn = undefined
 * 3. Drag disabled - move buttons are visible, but disabled
 * movable = false and moveBtn defined with "disabled" property
 * 4. Item is restricted to drop - use case when we need mark some nodes as restricted.
 * undroppable = true
 */
export interface NodeMoveProps {
    movable: boolean;
    // Mark node to restrict drop near this node
    dropRestricted?: boolean;
    // Drag and drop props
    type?: string;
    // Handle first
    allowedChildTypes?: string[];
    // Handle after
    allowedParents?: AllowedParent[];
}

export interface AllowedParent {
    path: PropertyPath;
    allowedRanges?: AllowedMoveRange[];
}

export interface NodePropertyOptions {
    key: boolean | string | number | undefined;
    text: string;
    reset?: boolean;
}

export interface TreeNodeProperty {
    name: string;
    value?: unknown;
    description?: string;
    displayName?: string;
    // New
    artifactType?: ArtifactType;
    schemaPath: PropertyPath;
    // ???
    type: 'string' | 'number' | 'boolean' | 'object';
    // type and options
    options?: NodePropertyOptions[];
    properties?: TreeNodeProperty[];
}

export const BOOLEAN_DISPLAY_TRUE = 'True';
export const BOOLEAN_DISPLAY_FALSE = 'False';

const NOT_ALLOWED_IN_FOOTER_AGGREGATION_NAMES = [DATA_FIELD_FOR_INTENT_BASED_NAVIGATION, DATA_FIELD_FOR_ACTION_GROUP];

/**
 * Method returns dom id for node.
 * @param path Node path.
 * @returns Outline node id.
 */
export function getNodeId(path: string): string {
    return `outline-node${path.replace(/\//g, '-')}`;
}

export function getGenericBase(
    name: string,
    displayName: string,
    property: SettingOption | ObjectAggregation,
    schemaPath: PropertyPath
): TreeNodeProperty {
    return {
        schemaPath,
        artifactType: property.artifactType,
        description: property.description ?? '',
        name,
        displayName,
        // Default
        type: 'string',
        value: property.value
    };
}

/**
 * Method checks if passed value is a valid number.
 * @param {any} value Value as unknown type.
 * @returns {boolean} Is nummber value.
 */
const isNumber = (value: number): boolean => {
    return !isNaN(value) && !isNaN(value - 0);
};

/**
 * Method returns options for passed enum entries.
 * @param {JSONSchema4Type[]} entries Enum entries.
 * @returns {Array<SelectionOption>} Array of options.
 */
const getEnumOptions = (entries: JSONSchema4Type[]): NodePropertyOptions[] => {
    const options: NodePropertyOptions[] = [];
    // Empty value for deletion
    options.push({
        key: '',
        text: ''
    });
    for (const option of entries) {
        let optionDisplay = option;
        if (typeof option === 'boolean') {
            // For boolean type display appropriate string entry
            optionDisplay = option ? BOOLEAN_DISPLAY_TRUE : BOOLEAN_DISPLAY_FALSE;
            options.push({
                key: option,
                text: optionDisplay
            });
        } else if (typeof option === 'string') {
            if (isNumber(parseFloat(option))) {
                options.push({
                    key: parseFloat(option),
                    text: option?.toString()
                });
            } else {
                options.push({
                    key: option,
                    text: option
                });
            }
        } else if (typeof option === 'number' && isNumber(option)) {
            options.push({
                key: option,
                text: option?.toString()
            });
        }
    }
    return options;
};

function updateStringProperty(property: TreeNodeProperty, schema: JSONSchema4) {
    if (schema.enum || schema.oneOf) {
        let options: NodePropertyOptions[] = [];
        if (schema.enum) {
            options = getEnumOptions(schema.enum);
        } else if (schema.oneOf) {
            options = schema.oneOf.map((entry: JSONSchema4) => {
                const text: string = entry.const;
                return {
                    key: entry.const,
                    text
                };
            });
            // Empty value for deletion
            options.unshift({
                key: '',
                text: '',
                reset: true
            });
        }
        property.options = options;
    }
}

export function getPropertyData(
    name: string,
    displayName: string,
    property: SettingOption,
    schemaPath: PropertyPath
): undefined | TreeNodeProperty {
    const type = property.schema.type;
    const propertyInstance = getGenericBase(name, displayName, property, schemaPath);
    switch (type) {
        case 'string':
            propertyInstance.type = 'string';
            updateStringProperty(propertyInstance, property.schema);
            break;
        case 'number': {
            propertyInstance.type = 'number';
            break;
        }
        case 'boolean': {
            propertyInstance.type = 'boolean';
            propertyInstance.options = [
                {
                    key: undefined,
                    text: ''
                },
                {
                    key: true,
                    text: 'True'
                },
                {
                    key: false,
                    text: 'False'
                }
            ];
            break;
        }
        default: {
            if (property.schema.enum) {
                getEnumOptions(property.schema.enum);
            } else {
                console.warn('Unhandled property', property);
            }
            break;
        }
    }
    return propertyInstance;
}

function getProperties(aggregation: ObjectAggregation, breadCrumbs: ObjectAggregation[] = []): TreeNodeProperty[] {
    const properties: TreeNodeProperty[] = [];
    // Standard properties on same level as visible aggregation
    const names = Object.keys(aggregation.properties);
    if (names.length) {
        names.forEach((name): void => {
            const property = aggregation.properties[name];
            const schemaPath = aggregation.path.concat(name);
            const genericProperty = getPropertyData(name, property.name, property, schemaPath);
            if (genericProperty) {
                properties.push(genericProperty);
            }
        });
    }
    // Complex properties which is on deeper level
    for (const name in aggregation.aggregations) {
        const childAggregation = aggregation.aggregations[name];
        if (childAggregation.isViewNode) {
            continue;
        }
        const objectProperty = getGenericBase(
            name,
            childAggregation.name ?? name,
            childAggregation,
            childAggregation.path
        );
        objectProperty.type = 'object';
        const subProperties = getProperties(childAggregation, [...breadCrumbs, aggregation]);
        if (subProperties.length) {
            objectProperty.properties = subProperties;
        }
        properties.push(objectProperty);
    }
    return properties;
}

/**
 * Recursive method goes through aggregation tree and creates tree node.
 * @param aggregation Start Aggregation.
 * @param traverseNodeData Traverse data contains traverse context information.
 * @returns Outline tree node.
 */
export function traverseTree(aggregation: ObjectAggregation, traverseNodeData: TraverseNodeData): TreeNode {
    const { text, level, model } = traverseNodeData;
    let { path } = traverseNodeData;
    const children: Array<TreeNode> = [];
    const aggregationKeys = aggregation.getAggregationKeys(true);
    // Apply received filter to nodes
    const id = getNodeId(aggregation === model.root ? 'root-node' : `${path}-node`);
    if (aggregation.virtual && model.pageType === PageTypeV4.FPMCustomPage) {
        // Root virtual node should be ignored during path resolution
        // Macros within Custom Page does not have separate property in config.json,
        // in result to match ids between outline and properties panel - id path should be reset
        path = '';
    }
    for (const name of aggregationKeys) {
        const aggregationPath = path + '/' + name;
        const childAggregation = aggregation.aggregations[name];
        // external/app I18n bundle is not supported currently
        // const appI18n = getAppI18nBundle();
        // const i18nBundle = getRelevantI18nBundle(childAggregation, appI18n.bundles, appI18n.projectType);
        // const displayText = childAggregation.getDisplayName(i18nBundle);
        const displayText = childAggregation.getDisplayName();
        const node = traverseTree(childAggregation, {
            ...traverseNodeData,
            level: level + 1,
            path: aggregationPath,
            text: displayText
        });
        children.push(node);
    }

    let annotationNodeId = aggregation.annotationNodeId;
    if (!annotationNodeId && (aggregation instanceof RootAggregation || aggregation instanceof ViewsAggregation)) {
        annotationNodeId = [];
    }

    return {
        id: id,
        path: aggregation.path.map((subPath) => subPath) as string[],
        children,
        text: text,
        // actions: getActions(aggregation, id, features),
        // icon: getIcon(model, aggregation),
        additionalText: aggregation.additionalText,
        moveProps: getMovable(model, aggregation),
        title: aggregation.getTechnicalName(),
        properties: getProperties(aggregation),
        annotationNodeId,
        type: getNodeType(aggregation),
        value: aggregation.value
    };
}

/**
 * Method returns node's movable props.
 * @param model Edit model.
 * @param aggregation Aggregation object.
 * @param nodeId Node id.
 * @param features Supported app features.
 * @returns Movable props.
 */
function getMovable(model: PageEditModel, aggregation: ObjectAggregation): NodeMoveProps | undefined {
    // Custom extensions are movable, but annotation nodes depends if annotation support feature is enabled
    if (model.root !== aggregation) {
        const isMovable = true;
        const moveProps: NodeMoveProps = {
            movable: aggregation.sortableItem === SortingOptions.Enabled && isMovable,
            allowedParents: getAllowedParentPaths(model.root, aggregation),
            allowedChildTypes:
                aggregation.sortableList && aggregation.sortableCollection
                    ? [aggregation.sortableCollection]
                    : undefined,
            type: aggregation.sortableCollection
        };
        if (aggregation.sortableItem === SortingOptions.Excluded) {
            moveProps.dropRestricted = true;
        }
        return moveProps;
    }
    return undefined;
}

/**
 * Method returns array of node paths, which are allowed to drop/move in.
 * @param root Root aggregation.
 * @param aggregation Target aggregation to get alowed parents.
 * @returns Array of diagnostic messages for passed aggregation.
 */
function getAllowedParentPaths(root: ObjectAggregation, aggregation: ObjectAggregation): undefined | AllowedParent[] {
    let result: undefined | AllowedParent[] = undefined;
    if (aggregation.custom) {
        const allowedDropRange = aggregation.parent?.getAllowedDropRange(aggregation);
        result = [];
        if (aggregation.parent && allowedDropRange) {
            result.push({
                path: aggregation.parent.path,
                allowedRanges: allowedDropRange
            });
        }
    } else if (aggregation.dropUINodes) {
        let allowedParents = root.findAllowedDropAggregations(aggregation);
        if (NOT_ALLOWED_IN_FOOTER_AGGREGATION_NAMES.some((aggName) => aggregation.name?.startsWith(aggName))) {
            // restrict moving navigation node to footer - special case
            allowedParents = allowedParents.filter(
                (allowedParent) => !isArrayEqual(allowedParent.aggregation.path, ['footer', 'actions'])
            );
        }
        result = allowedParents.map((allowedParent) => ({
            path: allowedParent.aggregation.path,
            allowedRanges: allowedParent.range
        }));
    }
    return result;
}

function getNodeType(aggregation: ObjectAggregation): AggregationNodeType | undefined {
    let type: AggregationNodeType | undefined;
    if (aggregation.custom) {
        if (aggregation instanceof ActionAggregation) {
            type = AggregationNodeType.customAction;
        } else if (aggregation instanceof ColumnAggregation) {
            type = AggregationNodeType.customColumn;
        } else if (aggregation instanceof FilterFieldAggregation) {
            type = AggregationNodeType.customFilterField;
        } else if (aggregation instanceof SectionAggregation) {
            type = AggregationNodeType.customSection;
        }
    } else if (aggregation.path.length === 0) {
        type = AggregationNodeType.rootNode;
    } else if (aggregation instanceof ViewsAggregation) {
        type = AggregationNodeType.views;
    }
    return type;
}

/**
 * Method creates tree for passed edit model.
 * @param model Page edit model.
 * @param messages Array of messages.
 * @param filter Applied filter data.
 * @param features Supported features.
 * @returns Outline tree.
 */
export function getTree(
    schema: string,
    data: PageConfig,
    pageType: PageTypeV4,
    annotation?: PageAnnotations
): TreeNode {
    const model = new PageEditModel(
        'Root',
        pageType,
        data,
        schema,
        annotation ?? {
            dynamicNodes: {},
            nodes: []
        }
    );

    const node = traverseTree(model.root, {
        level: 0,
        path: '',
        text: model.name,
        model
    });
    // Update root node
    node.root = true;
    return node;
}

/**
 * Method finds node by passed annotation nodeId.
 * @param tree Nodes tree to lookup.
 * @param path Path to find node by.
 * @returns Found node information.
 */
export function findNodeByAnnotationNodeId(tree: TreeNode[], nodeId: number[]): TreeNode | undefined {
    for (const node of tree) {
        if (isArrayEqual(node.annotationNodeId, nodeId)) {
            // If the current node is the target, return it and its parent as null
            return node;
        } else if (node.children) {
            // If the current node has children, search for the target in each child
            const foundNode = findNodeByAnnotationNodeId(node.children, nodeId);
            if (foundNode) {
                // If the target is found in a child, return the child as the node and the current node as the parent
                return foundNode;
            }
        }
    }

    // If the target is not found
    return undefined;
}

export function findByPath(
    tree: TreeNode[],
    propertyPath: PropertyPath
): { node?: TreeNode; property?: TreeNodeProperty } | undefined {
    for (const node of tree) {
        // Check if the node itself matches
        if (isArrayEqual(node.path, propertyPath)) {
            return { node };
        }

        // Check direct properties of the node
        for (const property of node.properties) {
            if (isArrayEqual(property.schemaPath, propertyPath)) {
                return { property };
            }

            // Recursively search in nested properties
            const result = searchProperty(property, propertyPath);
            if (result) {
                return { node, property: result };
            }
        }

        // Recursively search in children nodes
        if (node.children) {
            const result = findByPath(node.children, propertyPath);
            if (result) {
                return result;
            }
        }
    }

    return undefined;
}

function searchProperty(property: TreeNodeProperty, propertyPath: PropertyPath): TreeNodeProperty | undefined {
    if (property.properties) {
        for (const child of property.properties) {
            if (isArrayEqual(child.schemaPath, propertyPath)) {
                return child;
            }

            const result = searchProperty(child, propertyPath);
            if (result) {
                return result;
            }
        }
    }
    return undefined;
}
