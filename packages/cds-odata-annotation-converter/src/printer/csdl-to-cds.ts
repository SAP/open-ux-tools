import type {
    Element,
    TextNode,
    Target,
    FormatterOptions,
    ElementName,
    AttributeName,
    TargetPath
} from '@sap-ux/odata-annotation-core';
import { Edm, ELEMENT_TYPE, TEXT_TYPE, printOptions as defaultPrintOptions } from '@sap-ux/odata-annotation-core';

import type { ContainerItemType } from './primitives';
import {
    valuePair,
    struct,
    collection,
    stringLiteral,
    delimitedIdentifier,
    keyAlone,
    PRIMITIVE_VALUE_ATTRIBUTE_NAMES,
    CDS_NULL_EXPRESSION_LITERAL
} from './primitives';
import { printEdmJson } from './edm-json';
import { indent } from './indent';

/**
 * Kind of target which is annotated
 * - describes expected CDS syntax, i.e. where to be deleted annotation is contained
 * - does not distinguish between annotation before or after element (or parameter)
 */
export const enum PrintPattern {
    artifact = 'artifact', // annotate <topLevelArtifact> with <annotations>
    element = 'element', // annotate <entity> with { <element> <annotation>}
    parameter = 'parameter', // annotate <unboundAction> with ( <parameter> <annotation> )
    boundAction = 'boundAction', // annotate <entity> with actions { <action> <annotation> }
    boundParameter = 'boundParameter' // annotate <entity> with actions { <action> ( <parameter> <annotation> ) }
}

/**
 * Get print pattern based on (EDMX) target path.
 *
 * @param targetPath - i.e. for bound action: AdminService.addRating(AdminService.Books).
 * @returns object containing root element name, bound action and function names, print pattern and child segments.
 */
export const resolveTarget = (
    targetPath: TargetPath
): {
    rootElementName: string;
    boundActionFunctionName: string;
    printPattern: PrintPattern;
    childSegments: string[];
} => {
    let printPattern: PrintPattern;
    let rootElementName = '';
    let boundActionFunctionName = '';
    let isBoundActionFunction = false;
    const segments = targetPath.split('/');
    const actionSegmentIndex = checkParenthesis(segments);
    if (actionSegmentIndex >= 0 && segments[actionSegmentIndex].indexOf('()') < 0) {
        isBoundActionFunction = true;
    }
    rootElementName = segments[0];
    const childSegments = segments.slice(1);
    if (actionSegmentIndex < 0) {
        // no action
        printPattern = segments.length === 1 ? PrintPattern.artifact : PrintPattern.element;
    } else if (isBoundActionFunction) {
        // bound action
        const fqboundActionFunctionName = rootElementName.split('(')[0];
        boundActionFunctionName = fqboundActionFunctionName.split('.').pop() as string;

        const matchResult = /\((.{0,127})\)/.exec(rootElementName);
        // Check if matchResult is not null before using pop
        const extractedValue = matchResult ? matchResult.pop() : null;

        rootElementName = extractedValue ?? ''; //restrict simple identifier max-length 128
        printPattern =
            actionSegmentIndex === segments.length - 1 ? PrintPattern.boundAction : PrintPattern.boundParameter;
    } else {
        // unbound action
        rootElementName = rootElementName.split('(')[0];
        printPattern = actionSegmentIndex === segments.length - 1 ? PrintPattern.artifact : PrintPattern.parameter;
    }
    return { rootElementName, boundActionFunctionName, printPattern, childSegments };
};

/**
 *
 * @param segments - array of path string.
 * @returns check (,) and return if condition meet.
 */
function checkParenthesis(segments: string[]): number {
    return segments.findIndex((segment) => segment.indexOf('(') > 0 && segment.indexOf('(') < segment.indexOf(')'));
}

export const printTarget = (target: Target): string => {
    const resolvedTarget = resolveTarget(target.name);
    const rootElementName = resolvedTarget.rootElementName;
    const childSegments = resolvedTarget.childSegments;
    const boundActionFunctionName = resolvedTarget.boundActionFunctionName;
    const options: FormatterOptions = { ...defaultPrintOptions, useSnippetSyntax: false };

    let result = [...target.terms.map((term) => internalPrint(term, options))].join(',\n') + '\n';

    if (!childSegments || childSegments.length === 0) {
        if (boundActionFunctionName) {
            result = getTargetForBoundActionFunctions(target, result, rootElementName, boundActionFunctionName);
        } else {
            // target is root element, use following syntax
            // annotate <targetRootElementName> with @(
            //    <term> <qualifier>: <value>
            // );
            result = `annotate ${rootElementName} with @(\n${result});\n`;
        }
    } else if (childSegments.length === 1) {
        if (boundActionFunctionName) {
            result = getTargetForBoundActionFunctions(
                target,
                result,
                rootElementName,
                boundActionFunctionName,
                childSegments[0]
            );
        } else {
            // target is child of root element, use following syntax
            // annotate <targetRootElementName> with {
            //     <targetChildElementName> @(
            //        <term> <qualifier>: <value>
            //     );
            // }
            result = `annotate ${rootElementName} with {\n${childSegments[0]} ${
                target.terms.length > 1 ? `@(${result})` : `@${result}`
            }};\n`;
        }
    }

    result = indent(result);
    return result;
};

export const print = (
    node: Element | TextNode | Element[] | TextNode[],
    options: FormatterOptions = defaultPrintOptions,
    indentResult = true
): string => {
    if (Array.isArray(node)) {
        const nodes: (Element | TextNode)[] = node;
        const withTrailingCommas = nodes
            .map((item: Element | TextNode) => internalPrint(item, options) + ',')
            .join('\n');
        return indentResult ? indent(withTrailingCommas) : withTrailingCommas;
    }
    return indentResult ? indent(internalPrint(node, options)) : internalPrint(node, options);
};

const internalPrint = (node: Element | TextNode, options: FormatterOptions): string => {
    if (node.type === ELEMENT_TYPE && node.name === Edm.Annotation) {
        return printNonRecordNode(node, false, options);
    }
    return printCsdlNode(node, options);
};

const escapeText = (input: string): string => {
    if (!input || typeof input !== 'string') {
        return input;
    }
    return input.replace(/'/g, "''");
};

export const printCsdlNode = (node: Element | TextNode, options: FormatterOptions): string => {
    switch (node.type) {
        case ELEMENT_TYPE:
            if (node.name === Edm.Record) {
                return printRecord(node, options);
            } else {
                return printNonRecordNode(node, true, options);
            }
        case TEXT_TYPE:
            // text nodes can have all kinds of primitive values which might need enclosing '' or not (e.g. true, false, paths)
            return escapeText(node.text);
        default:
            return '';
    }
};

const printNonRecordNode = (node: Element, embedded: boolean, options: FormatterOptions): string => {
    const value = wrapNonRecordNodeValue(node, embedded, options);
    if (node.name === Edm.Annotation || node.name === Edm.PropertyValue) {
        // Annotation and PropertyValue need special handling because they also include 'key' part of the key value pair
        const key = printKey(node, embedded);
        return value === undefined ? keyAlone(key) : valuePair(key, value);
    }
    return value;
};

const wrapNonRecordNodeValue = (node: Element, embedded: boolean, options: FormatterOptions): string => {
    const annotations = (node.content || []).filter(annotationFilter) as Element[];
    const value = printNonRecordValue(node, options);
    if (annotations.length) {
        const valueProperty = valuePair(encodeSnippet(options, '$value'), value);
        const annotationProperties = annotations.map((annotation) => printNonRecordNode(annotation, true, options));
        return struct([valueProperty, ...annotationProperties]);
    }
    return value;
};

const printKey = (node: Element, embedded: boolean): string => {
    switch (node.name) {
        case Edm.Annotation:
            return printAnnotationTerm(node, embedded);
        case Edm.PropertyValue:
            return printPropertyName(node);
        default:
            return '';
    }
};

const printContainerNode =
    (options: FormatterOptions) =>
    (node: Element | TextNode): ContainerItemType => {
        const value = printCsdlNode(node, options);
        if (options.useSnippetSyntax && value.startsWith('$')) {
            return {
                placeholder: true,
                value
            };
        }
        return value;
    };

const printNonRecordValue = (node: Element, options: FormatterOptions): string => {
    switch (node.name) {
        case Edm.Annotation:
        case Edm.PropertyValue: {
            return printValue(node, options) as string;
        }
        case Edm.Collection: {
            const items = (node.content ?? [])
                .filter((node) => node.type === ELEMENT_TYPE || node.text.trim() !== '')
                .map(printContainerNode(options));
            return collection(items);
        }
        case Edm.Null: {
            return printPrimitiveValue(node.name, '');
        }
        case Edm.If:
        case Edm.Not:
        case Edm.Apply: {
            // fallback to EdmJson syntax

            return printEdmJson(node, {
                ...options,
                includeEdmJson: true,
                removeRootElementContainer: false,
                skipIndent: true
            });
        }

        default: {
            if (node.content && node.content.length > 0) {
                return node.content
                    .map((nodeContent) =>
                        nodeContent.type === TEXT_TYPE
                            ? printPrimitiveValue(node.name, nodeContent.text)
                            : printCsdlNode(nodeContent, options)
                    )
                    .join('');
            } else {
                return '';
            }
        }
    }
};

const printAttributePrimitiveValue = (element: Element): string | undefined => {
    const attributes = element.attributes ?? {};
    const { value, placeholder }: { value?: string; placeholder?: string } = Object.keys(attributes).reduce(
        (accumulator, attributeName) => {
            if (PRIMITIVE_VALUE_ATTRIBUTE_NAMES.has(attributeName)) {
                return {
                    ...accumulator,
                    value: printPrimitiveValue(attributeName, attributes[attributeName].value)
                };
            }

            if (attributeName.startsWith('$')) {
                return {
                    ...accumulator,
                    placeholder: attributeName
                };
            }
            return accumulator;
        },
        {}
    );
    if (value) {
        return value;
    }
    if (placeholder) {
        return placeholder;
    }

    return undefined;
};

const annotationFilter = (node: Element | TextNode): boolean =>
    node.type === ELEMENT_TYPE && node.name === Edm.Annotation;

const encodeSnippet = (options: FormatterOptions, text: string): string =>
    options.useSnippetSyntax ? text.replace(/\$/g, '\\$') : text;

const printValue = (element: Element, options: FormatterOptions): string | undefined => {
    const valueElement =
        (element.content ?? []).find((node) => node.type === ELEMENT_TYPE && node.name !== Edm.Annotation) ??
        (element.content ?? []).find((node) => node.type !== ELEMENT_TYPE && node.text.trim() !== '');
    const edmDynamicTypes = [Edm.If, Edm.Not, Edm.Apply] as string[];
    if (valueElement?.type === ELEMENT_TYPE && edmDynamicTypes.includes(valueElement.name)) {
        // fallback to EdmJson syntax

        return printEdmJson(valueElement, {
            ...options,
            includeEdmJson: true,
            removeRootElementContainer: false,
            skipIndent: true
        });
    }

    if (valueElement) {
        return printCsdlNode(valueElement, options);
    }
    const primitiveAttributeValue = printAttributePrimitiveValue(element);
    if (primitiveAttributeValue) {
        return primitiveAttributeValue;
    }
    return undefined;
};

const printPropertyName = (element: Element): string => {
    const attributes = element.attributes ?? {};
    return attributes[Edm.Property]?.value ?? '';
};

const encodeTerm = (embedded: boolean, text: string): string => (embedded ? delimitedIdentifier(`@${text}`) : text);

const printAnnotationTerm = (element: Element, embedded: boolean): string => {
    const attributes = element.attributes ?? {};
    const { term, qualifier }: { term?: string; qualifier?: string; qualifierPlaceholder?: string } = Object.keys(
        attributes
    ).reduce((accumulator, attributeName) => {
        if (attributeName === Edm.Term) {
            return { ...accumulator, term: encodeTerm(embedded, element.attributes[attributeName].value) };
        }
        if (attributeName === Edm.Qualifier) {
            return { ...accumulator, qualifier: attributes[attributeName].value };
        }
        return accumulator;
    }, {});
    if (term) {
        if (qualifier) {
            return `${term} #${qualifier}`;
        }
        return term;
    }
    return '';
};

const printRecord = (element: Element, options: FormatterOptions): string => {
    const content = element.content ?? [];
    const skipTextNodes =
        content.find((child) => child.type === ELEMENT_TYPE && child.name !== Edm.Annotation) !== undefined;

    const properties = content
        .filter(
            (child) =>
                (!skipTextNodes && child.type !== ELEMENT_TYPE) ||
                (child.type === ELEMENT_TYPE && child.name !== Edm.Annotation)
        )
        .map(printContainerNode(options));
    const annotations = (content.filter(annotationFilter) as Element[]).map((annotation: Element) =>
        printNonRecordNode(annotation, true, options)
    );
    const typeAttribute = element.attributes ? element.attributes['Type'] : undefined;
    if (typeAttribute?.value) {
        const type = valuePair(encodeSnippet(options, '$Type'), `'${typeAttribute.value}'`);
        return struct([type, ...properties, ...annotations]);
    } else {
        return struct([...properties, ...annotations]);
    }
};

const printPathValue = (path: string): string => {
    if (path.indexOf('@') >= 0) {
        // if @ contained: use special syntax
        return delimitedIdentifier(path);
    } else {
        // convert path to native cds paths
        return path.split('/').join('.');
    }
};

export const printPrimitiveValue = (expressionName: ElementName | AttributeName, expressionValue: string): string => {
    let result = '';
    let enumValues: string[];
    switch (expressionName) {
        // constant expressions http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_ConstantExpression
        case Edm.Bool:
        case Edm.Decimal:
        case Edm.Duration:
        case Edm.Float:
        case Edm.Int:
            // native values should work in CDS - don't use quotation marks
            result = expressionValue;
            break;
        case Edm.Null:
            result = CDS_NULL_EXPRESSION_LITERAL;
            break;
        case Edm.DateTimeOffset:
        case Edm.TimeOfDay:
        case Edm.Date:
            result = stringLiteral(expressionValue);
            break;
        case Edm.String:
            result = stringLiteral(escapeText(expressionValue));
            break;
        case Edm.EnumMember:
            // enum values start with # and do not include type name in CDS, render multiple once as array
            enumValues = expressionValue.split(' ');
            if (enumValues.length > 1) {
                result = enumValues.map((enumValue) => '#' + enumValue.split('/').pop()).join(', ');
                result = `[ ${result} ]`;
            } else {
                result = '#' + expressionValue.split('/').pop();
            }
            break;
        case Edm.Guid:
        case Edm.Binary:
            // not (yet) supported!
            result = stringLiteral(expressionValue);
            break;
        // path expressions http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_PathExpressions
        case Edm.AnnotationPath:
            // annotation path:  always use quotation mark (e.g. for snippet value $0) and keep format as in csdl
            result = stringLiteral(expressionValue);
            break;
        case Edm.ModelElementPath:
        case Edm.NavigationPropertyPath:
        case Edm.PropertyPath:
        case Edm.Path:
            // other paths: use quotation mark only if @ is contained
            result = printPathValue(expressionValue);
            break;
        default:
            return '';
    }
    return result;
};

/**
 * Generates an annotation string for bound action functions in CDS (Core Data Services).
 *
 * @param target - The target to be annotated.
 * @param terms - The terms to be used in the annotation.
 * @param rootElementName - The root element name for the annotation.
 * @param boundActionFunctionName - The name of the bound action function.
 * @param [childSegment] - The optional child segment for the annotation.
 * @returns The generated annotation string for bound action functions.
 */
function getTargetForBoundActionFunctions(
    target: Target,
    terms: string,
    rootElementName: string,
    boundActionFunctionName: string,
    childSegment?: string
): string {
    let result = `annotate ${rootElementName} with actions {\n${boundActionFunctionName} `;
    if (target.terms.length > 1) {
        if (childSegment) {
            result += `(\n${childSegment} @(${terms}))\n};`;
        } else {
            result += `@${terms}};`;
        }
    } else if (childSegment) {
        result += `(\n${childSegment} @${terms})\n};`;
    } else {
        result += `@${terms}};`;
    }
    return result;
}
