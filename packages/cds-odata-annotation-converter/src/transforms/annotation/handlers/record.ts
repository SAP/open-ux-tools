import { RECORD_TYPE, STRING_LITERAL_TYPE, nodeRange, ReservedProperties } from '@sap-ux/cds-annotation-parser';
import type { Record, RecordProperty, AnnotationNode } from '@sap-ux/cds-annotation-parser';

import type { Element } from '@sap-ux/odata-annotation-core-types';
import {
    Diagnostic,
    createElementNode,
    createAttributeNode,
    Edm,
    DiagnosticSeverity
} from '@sap-ux/odata-annotation-core-types';

import { i18n } from '../../../i18n';

import type { ConvertResult, NodeHandler, Subtree } from '../handler';
import type { Context, VisitorState } from '../visitor-state';
import { EdmJsonVisitor } from './edm-json';

export const recordHandler: NodeHandler<Record> = {
    type: RECORD_TYPE,
    getChildren,
    convert(state: VisitorState, node: Record): ConvertResult {
        const element: Element = createElementNode({
            name: Edm.Record,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, false)
        });
        const { typeProperty, valueProperty, edmJsonProperty } = findReservedProperties(node.properties);

        const explicitType = getExplicitType(typeProperty, state.context);
        const implicitType = getImplicitType(typeProperty, state.context);

        // We need to resolve types to correctly handle conversion of child nodes that are type dependant
        const recordType = explicitType ?? implicitType;

        if (edmJsonProperty) {
            return handleEdmJson(state, edmJsonProperty);
        }

        const isValueContainer = getIsValueContainer(state, valueProperty);
        handleValueProperty(state, node, isValueContainer ?? false, valueProperty);

        state.pushContext({ ...state.context, recordType, inValueContainer: isValueContainer });
        if (isValueContainer) {
            // record containing $value should not be converted
            return undefined;
        }
        validateReservedPropertyName(state, ReservedProperties.Type, typeProperty);

        // We only add Type attribute if $Type property exits or compiler has custom logic for resolving this ambiguity
        if (explicitType !== undefined) {
            element.attributes[Edm.Type] = createAttributeNode(
                Edm.Type,
                explicitType,
                typeProperty ? nodeRange(typeProperty.name, true) : undefined,
                typeProperty?.value?.type === STRING_LITERAL_TYPE ? nodeRange(typeProperty.value, false) : undefined
            );
        }

        return element;
    }
};

/**
 * Gets the children annotation nodes for the provided record node based on the visitor state.
 *
 * @param state - The visitor state.
 * @param node - The record node.
 * @returns The array of children annotation nodes.
 */
function getChildren(state: VisitorState, node: Record): AnnotationNode[] {
    const { edmJsonProperty, valueProperty } = findReservedProperties(node.properties);
    if (edmJsonProperty) {
        return [];
    }
    if (getIsValueContainer(state, valueProperty)) {
        const children: AnnotationNode[] = [];
        if (valueProperty?.value) {
            children.push(valueProperty.value);
        }
        // Empty values are not treated as annotations because they are not prefixed with @.
        // However, in value container only annotations are possible,
        // so we assume that they are annotations and traverse them.
        // PropertyValue elements are converted to Annotation elements at the end.
        Array.prototype.push.apply(
            children,
            node.properties.filter((property) => property !== valueProperty)
        );
        if (node.annotations) {
            Array.prototype.push.apply(children, node.annotations);
        }
        return children;
    }
    const recordProperties = node.properties.filter(
        (property) =>
            property.name.value !== ReservedProperties.Type &&
            property.name.value.toUpperCase() !== ReservedProperties.Value.toUpperCase()
    );
    return [...recordProperties, ...(node.annotations ?? [])];
}

const uiDataFieldAbstract = 'com.sap.vocabularies.UI.v1.DataFieldAbstract';
const uiDataField = 'com.sap.vocabularies.UI.v1.DataField';

const getImplicitType = (typeProperty: RecordProperty | undefined, context: Context): string | undefined => {
    if (typeProperty?.value?.type === STRING_LITERAL_TYPE) {
        return typeProperty.value.value;
    }
    if (context.valueType) {
        if (context.valueType === uiDataFieldAbstract) {
            return uiDataField;
        } else {
            return context.valueType;
        }
    } else if (context.termType === uiDataFieldAbstract) {
        return uiDataField;
    }
    return undefined;
};

/**
 * Gets the explicit type from the provided type property and context.
 *
 * @param typeProperty - The type property to retrieve the explicit type from.
 * @param context - The context containing additional information.
 * @returns The explicit type or undefined if not found.
 */
function getExplicitType(typeProperty: RecordProperty | undefined, context: Context): string | undefined {
    if (typeProperty?.value?.type === STRING_LITERAL_TYPE && typeProperty?.name?.value === ReservedProperties.Type) {
        return typeProperty.value.value;
    }
    if (context.valueType === uiDataFieldAbstract) {
        return uiDataField;
    }
    return undefined;
}

interface FoundReservedProperties {
    typeProperty?: RecordProperty;
    valueProperty?: RecordProperty;
    edmJsonProperty?: RecordProperty;
}

const normalizedTypePropertyName = ReservedProperties.Type.toUpperCase();
const normalizedValuePropertyName = ReservedProperties.Value.toUpperCase();
const normalizedEdmJsonPropertyName = ReservedProperties.EdmJson.toUpperCase();

/**
 * Finds reserved properties in the provided array of record properties.
 *
 * @param properties - The array of record properties to search.
 * @returns An object containing found reserved properties.
 */
function findReservedProperties(properties: RecordProperty[]): FoundReservedProperties {
    const result: FoundReservedProperties = {};
    for (const property of properties) {
        const normalizedName = property.name.value.toUpperCase();
        if (normalizedName === normalizedTypePropertyName) {
            result.typeProperty = property;
        } else if (normalizedName === normalizedValuePropertyName) {
            result.valueProperty = property;
        } else if (
            normalizedName === normalizedEdmJsonPropertyName ||
            (normalizedName.startsWith('$EDMJ') && property.name.value.length <= normalizedEdmJsonPropertyName.length)
        ) {
            result.edmJsonProperty = property;
        }
    }
    return result;
}

/**
 * Handles the EdmJson property in the provided record property based on the visitor state.
 *
 * @param state - The visitor state.
 * @param edmJsonProperty - The EdmJson record property to handle.
 * @returns The processed element, subtree, or undefined if not applicable.
 */
function handleEdmJson(
    state: VisitorState,
    edmJsonProperty: RecordProperty | undefined
): Element | Subtree | undefined {
    if (edmJsonProperty) {
        validateReservedPropertyName(state, ReservedProperties.EdmJson, edmJsonProperty);
        if (edmJsonProperty.value && edmJsonProperty.name.value === ReservedProperties.EdmJson) {
            const edmVisitor = new EdmJsonVisitor(state);
            return edmVisitor.visit(edmJsonProperty.value);
        }
    }
    return undefined;
}

/**
 * Handles the value property in the provided record node based on the visitor state and value container information.
 *
 * @param state - The visitor state.
 * @param node - The record node.
 * @param isValueContainer - A boolean indicating whether the node is a value container.
 * @param valueProperty - The value property associated with the record node.
 */
function handleValueProperty(
    state: VisitorState,
    node: Record,
    isValueContainer: boolean,
    valueProperty: RecordProperty | undefined
): void {
    if (isValueContainer) {
        if (!valueProperty && node.range) {
            const message = i18n.t('Mandatory_property_not_provided_0', {
                property: ReservedProperties.Value
            });
            state.addDiagnostic(Diagnostic.create(node.range, message, DiagnosticSeverity.Error));
        }

        validateReservedPropertyName(state, ReservedProperties.Value, valueProperty);
        addDiagnosticForExtraneousProperties(state, node, valueProperty);
    }
}

/**
 * Adds diagnostics for extraneous properties in the provided node based on the visitor state and value property.
 *
 * @param state - The visitor state.
 * @param node - The record node containing properties to check.
 * @param valueProperty - The value property associated with the record.
 */
function addDiagnosticForExtraneousProperties(
    state: VisitorState,
    node: Record,
    valueProperty: RecordProperty | undefined
): void {
    const typeInfo = state.context.valueType ? state.vocabularyService.getType(state.context.valueType) : undefined;
    if (
        valueProperty?.name?.value === ReservedProperties.Value ||
        typeInfo?.kind !== 'ComplexType' ||
        state.context.isCollection
    ) {
        for (const property of node.properties) {
            if (property.name.range && property.name.value.toUpperCase() !== normalizedValuePropertyName) {
                state.addDiagnostic({
                    message: i18n.t('Property_is_not_allowed_here', { name: property.name.value }),
                    range: property.name.range,
                    severity: DiagnosticSeverity.Warning
                });
            }
        }
    }
}

/**
 * Validates whether the provided property has the expected name, adding a diagnostic if not.
 *
 * @param state - The visitor state.
 * @param expectedName - The expected name for the property.
 * @param property - The record property to validate.
 * @returns True if the property has the expected name, false otherwise.
 */
function validateReservedPropertyName(
    state: VisitorState,
    expectedName: string,
    property: RecordProperty | undefined
): boolean {
    if (property && property.name.value !== expectedName && property.name.range) {
        // check if case issue
        const currentValue = property.name.value;
        const diagnostic = {
            message: i18n.t('Wrong_element_0_Did_you_mean_1', {
                currentValue: currentValue,
                proposedValue: expectedName
            }),
            range: property.name.range,
            severity: DiagnosticSeverity.Error,
            data: {
                caseCheck: {
                    value: currentValue,
                    proposedValue: expectedName,
                    lookupPath: [],
                    isNamespacedValue: false
                }
            }
        };
        state.addDiagnostic(diagnostic);
        return false;
    }
    return true;
}

/**
 * Gets a boolean indicating whether the provided value property is a value container based on the visitor state.
 *
 * @param state - The visitor state.
 * @param valueProperty - The value property to check.
 * @returns True if the value property is a value container, false otherwise.
 */
function getIsValueContainer(state: VisitorState, valueProperty: RecordProperty | undefined): boolean {
    const typeInfo = state.context.valueType ? state.vocabularyService.getType(state.context.valueType) : undefined;
    return (
        valueProperty !== undefined ||
        (state.context.valueType !== undefined &&
            (typeInfo?.kind !== 'ComplexType' || state.context.isCollection === true))
    );
}
