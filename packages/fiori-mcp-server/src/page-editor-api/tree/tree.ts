import type { ArtifactType, Parser } from '@sap/ux-specification/dist/types/src';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import { isArrayEqual } from './utils';
import type { JSONSchema4, JSONSchema4Type } from 'json-schema';
import { logger } from '../../utils/logger';
import { SortingOptions } from './types';
import type { AllowedMoveRange, ObjectAggregation, SettingOption, PropertyPath } from './types';

interface TraverseNodeData {
    text: string;
    level: number;
    path: string;
    model: Parser.TreeModel;
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
    additionalText?: string;
    // Drag and drop properties
    moveProps?: NodeMoveProps;
    properties: TreeNodeProperty[];
    // Annotation node id
    annotationNodeId?: number[];
    value?: unknown;
    schema: JSONSchema4;
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
    // Property type
    type: 'string' | 'number' | 'boolean' | 'object';
    // type and options
    options?: NodePropertyOptions[];
    properties?: TreeNodeProperty[];
    schema: JSONSchema4;
}

export const BOOLEAN_DISPLAY_TRUE = 'True';
export const BOOLEAN_DISPLAY_FALSE = 'False';

/**
 * Method returns dom id for node.
 *
 * @param path Node path.
 * @returns Outline node id.
 */
export function getNodeId(path: string): string {
    return `outline-node${path.replaceAll('/', '-')}`;
}

/**
 * Creates a generic `TreeNodeProperty` object from a property or aggregation.
 *
 * @param name - The name of the property.
 * @param displayName - The display name of the property.
 * @param property - The source property or aggregation.
 * @param schemaPath - The schema path for the property.
 * @returns The generated tree node property.
 */
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
        value: property.value,
        schema: property.schema ?? {}
    };
}

/**
 * Method checks if passed value is a valid number.
 *
 * @param value Value as unknown type.
 * @returns Is nummber value.
 */
const isNumber = (value: number): boolean => {
    return !Number.isNaN(value) && !Number.isNaN(value - 0);
};

/**
 * Method returns options for passed enum entries.
 *
 * @param entries Enum entries.
 * @returns Array of options.
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
            const optionAsDecimal = Number.parseFloat(option);
            if (isNumber(optionAsDecimal)) {
                options.push({
                    key: optionAsDecimal,
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

/**
 * Updates a string property definition based on its JSON Schema.
 *
 * @param property The tree node property being updated.
 * @param schema The JSON Schema definition for the property.
 */
function updateStringProperty(property: TreeNodeProperty, schema: JSONSchema4): void {
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

/**
 * Generates a `TreeNodeProperty` with type-specific configurations based on a `SettingOption`.
 *
 * @param name - The name of the property.
 * @param displayName - The display name of the property.
 * @param property - The source property.
 * @param schemaPath - The schema path for the property.
 * @returns The configured tree node property, or `undefined` if unhandled.
 */
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
                logger.warn(`Unhandled property: ${JSON.stringify(property)}`);
            }
            break;
        }
    }
    return propertyInstance;
}

/**
 * Recursively collects properties from an aggregation and its child aggregations,
 * converting them into `TreeNodeProperty` objects.
 *
 * @param aggregation - The root aggregation to extract properties from.
 * @param breadCrumbs - The chain of parent aggregations leading to this aggregation (used for recursive context).
 * @returns A flat list of properties and nested object properties derived from the aggregation.
 */
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
 *
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
    if (
        !annotationNodeId &&
        (aggregation.constructor.name === 'RootAggregation' || aggregation.constructor.name === 'ViewsAggregation')
    ) {
        annotationNodeId = [];
    }

    return {
        id: id,
        path: aggregation.path.map((subPath) => subPath) as string[],
        children,
        text: text,
        additionalText: aggregation.additionalText,
        moveProps: getMovable(model, aggregation),
        title: aggregation.getTechnicalName(),
        properties: getProperties(aggregation),
        annotationNodeId,
        // type: getNodeType(aggregation),
        value: aggregation.value,
        schema: aggregation.schema ?? {}
    };
}

/**
 * Method returns node's movable props.
 *
 * @param model Edit model.
 * @param aggregation Aggregation object.
 * @returns Movable props.
 */
function getMovable(model: Parser.TreeModel, aggregation: ObjectAggregation): NodeMoveProps | undefined {
    // Custom extensions are movable, but annotation nodes depends if annotation support feature is enabled
    if (model.root !== aggregation) {
        const isMovable = true;
        const moveProps: NodeMoveProps = {
            movable: aggregation.sortableItem === SortingOptions.Enabled && isMovable,
            allowedParents: getAllowedParentPaths(aggregation),
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
 *
 * @param aggregation Target aggregation to get alowed parents.
 * @returns Array of diagnostic messages for passed aggregation.
 */
function getAllowedParentPaths(aggregation: ObjectAggregation): undefined | AllowedParent[] {
    let result: undefined | AllowedParent[];
    if (aggregation.custom) {
        const allowedDropRange = aggregation.parent?.getAllowedDropRange(aggregation);
        result = [];
        if (aggregation.parent && allowedDropRange) {
            result.push({
                path: aggregation.parent.path,
                allowedRanges: allowedDropRange
            });
        }
    }
    return result;
}

/**
 * Method creates tree for passed edit model.
 *
 * @param model Tree model from speficiation API.
 * @returns Outline tree.
 */
export function getTree(model: Parser.TreeModel): TreeNode {
    const root = model.root as ObjectAggregation;
    const node = traverseTree(root, {
        level: 0,
        path: '',
        text: model.name,
        model: model as any
    });
    // Update root node
    node.root = true;
    node.schema = model.schema;
    return node;
}

/**
 * Finds a node or property in a tree by its property path.
 *
 * @param tree - The tree of nodes to search.
 * @param propertyPath - The path of the property to find.
 * @returns The matching node or property if found, otherwise `undefined`.
 */
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
        const result = node.children ? findByPath(node.children, propertyPath) : undefined;
        if (result) {
            return result;
        }
    }

    return undefined;
}

/**
 * Recursively searches nested properties of a `TreeNodeProperty` for a matching schema path.
 *
 * @param property - The property to search within.
 * @param propertyPath - The schema path to match.
 * @returns The matching nested property if found, otherwise `undefined`.
 */
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
