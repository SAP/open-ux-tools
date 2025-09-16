import { RECORD_TYPE, STRING_LITERAL_TYPE, nodeRange, ReservedProperties } from '@sap-ux/cds-annotation-parser';
import type { Record, RecordProperty, AnnotationNode, Annotation } from '@sap-ux/cds-annotation-parser';

import type { CommonCaseIssue, Element, Position } from '@sap-ux/odata-annotation-core-types';
import {
    COMMON_CASE_ISSUE,
    DEPRECATED_$VALUE_SYNTAX,
    Range,
    TextEdit,
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
    convert(state: VisitorState, node: Record, parent?: AnnotationNode): ConvertResult {
        const element: Element = createElementNode({
            name: Edm.Record,
            range: nodeRange(node, true),
            contentRange: nodeRange(node, false)
        });
        if (!parent) {
            return element;
        }
        const { typeProperty, valueProperty, edmJsonProperty } = findReservedProperties(node.properties);

        const explicitType = getExplicitType(typeProperty, state.context);
        const implicitType = getImplicitType(typeProperty, state.context);

        // We need to resolve types to correctly handle conversion of child nodes that are type dependant
        const recordType = explicitType ?? implicitType;

        if (edmJsonProperty) {
            return handleEdmJson(state, edmJsonProperty, parent);
        }

        const isValueContainer = getIsValueContainer(state, valueProperty);
        handleValueProperty(state, node, isValueContainer ?? false, valueProperty, parent);

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
 * @param parent - The parent AnnotationNode.
 * @returns The processed element, subtree, or undefined if not applicable.
 */
function handleEdmJson(
    state: VisitorState,
    edmJsonProperty: RecordProperty | undefined,
    parent: AnnotationNode
): Element | Subtree | undefined {
    if (edmJsonProperty) {
        validateReservedPropertyName(state, ReservedProperties.EdmJson, edmJsonProperty);
        if (edmJsonProperty.value && edmJsonProperty.name.value === ReservedProperties.EdmJson) {
            const edmVisitor = new EdmJsonVisitor(state);
            return edmVisitor.visit(edmJsonProperty.value, parent);
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
 * @param parent - Parent node.
 */
function handleValueProperty(
    state: VisitorState,
    node: Record,
    isValueContainer: boolean,
    valueProperty: RecordProperty | undefined,
    parent: AnnotationNode
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
        addDeprecatedDiagnostics(state, node, valueProperty, parent);
    }
}

/**
 * Adds diagnostics for deprecated $value syntax.
 *
 * @param state - The visitor state.
 * @param node - The artificial record node containing the $value property.
 * @param valueProperty - $value property node.
 * @param parent - Parent node.
 */
function addDeprecatedDiagnostics(
    state: VisitorState,
    node: Record,
    valueProperty: RecordProperty | undefined,
    parent: AnnotationNode
): void {
    if (!valueProperty?.name.range || !node.range || !parent.range || !valueProperty.range) {
        return;
    }
    if ((parent.type !== 'annotation' && parent.type !== 'record-property') || !parent.value?.range) {
        return;
    }

    const edits: TextEdit[] = [];

    const prefix = getNestedPrefix(parent);

    if (!prefix) {
        return;
    }
    const parentRange = structuredClone(parent.range);
    const startPosition = getStartPosition(parent);
    if (!startPosition) {
        return;
    }
    const opening = structuredClone(Range.create(startPosition, node.range.start));

    // We need to remove everything from the $value container except the actual value
    // Annotations will be cut out separately
    opening.end.line = valueProperty.name.range.end.line;
    opening.end.character = valueProperty.name.range.end.character;
    const closing = structuredClone(Range.create(node.range.end, parent.range.end));
    closing.start.line = valueProperty.range.end.line;
    closing.start.character = valueProperty.range.end.character;
    edits.push(TextEdit.del(opening));
    if (valueProperty.value?.range && valueProperty.value.range.start.line !== valueProperty.value.range.end.line) {
        const indentSize = 4;
        for (let i = valueProperty.value.range.start.line + 1; i <= valueProperty.value.range.end.line; i++) {
            edits.push(TextEdit.del(Range.create(i, 0, i, indentSize)));
        }
    }
    edits.push(TextEdit.del(closing));

    const additionalAnnotationRanges: Range[] = [];
    for (const annotation of node.annotations ?? []) {
        if (!annotation.range) {
            continue;
        }
        additionalAnnotationRanges.push(annotation.range);
    }
    state.addDiagnostic({
        message: i18n.t('diagnostics.deprecated_$value_syntax'),
        rule: DEPRECATED_$VALUE_SYNTAX,
        range: valueProperty.name.range,
        severity: DiagnosticSeverity.Warning,
        data: {
            descriptionLink: 'https://cap.cloud.sap/docs/releases/archive/2022/jun22#annotating-odata-annotations',
            valueReplacement: edits,
            additionalAnnotationRanges,
            prefix,
            parentRange
        }
    });
}

/**
 * Gets start position of the node.
 *
 * @param node - Parent node.
 * @returns Position if available.
 */
function getStartPosition(node: Annotation | RecordProperty): Position | undefined {
    if (node.type === 'annotation') {
        return node.qualifier ? node.qualifier.range?.end : node.term.range?.end;
    } else if (node.type === 'record-property') {
        return node.name.range?.end;
    }
    return undefined;
}

/**
 * Creates a prefix for nested annotations based on the parent node.
 *
 * @param parent - Parent node.
 * @returns Prefix that should be used for nested annotations.
 */
function getNestedPrefix(parent: Annotation | RecordProperty): string {
    if (parent.type === 'annotation') {
        if (parent.qualifier) {
            // Qualifier in flattened syntax still requires escaping
            return `![${parent.term.value}#${parent.qualifier.value}]`;
        }
        return parent.term.value;
    } else if (parent.type === 'record-property') {
        return parent.name.value;
    }
    return '';
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
        const diagnostic: CommonCaseIssue = {
            message: i18n.t('Wrong_element_0_Did_you_mean_1', {
                currentValue: currentValue,
                proposedValue: expectedName
            }),
            rule: COMMON_CASE_ISSUE,
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
