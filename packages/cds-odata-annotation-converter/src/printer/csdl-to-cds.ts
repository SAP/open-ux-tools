import type {
    Element,
    TextNode,
    Target,
    FormatterOptions,
    ElementName,
    AttributeName,
    TargetPath
} from '@sap-ux/odata-annotation-core';
import {
    Edm,
    ELEMENT_TYPE,
    TEXT_TYPE,
    printOptions as defaultPrintOptions,
    getElementAttributeValue
} from '@sap-ux/odata-annotation-core';

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

export const printTarget = (target: Target, complexTypePathSegments?: string[]): string => {
    const resolvedTarget = resolveTarget(target.name);
    const rootElementName = resolvedTarget.rootElementName;
    const childSegments = resolvedTarget.childSegments;
    const boundActionFunctionName = resolvedTarget.boundActionFunctionName;
    const options: FormatterOptions = { ...defaultPrintOptions, useSnippetSyntax: false };

    const terms = [...target.terms.flatMap((term) => internalPrint(term, options))];
    if (terms.length > 1 && !terms[terms.length - 1].endsWith(',')) {
        // make sure there is trailing comma
        terms[terms.length - 1] += ',';
    }

    let result = terms.join(',\n') + (complexTypePathSegments?.length ? ';' : '\n');

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
            const assignment = terms.length > 1 ? `@(\n${result})` : `@${result}`;
            if (complexTypePathSegments?.length) {
                const complexTarget = complexTypePathSegments?.join('.');
                result = `annotate ${rootElementName} : ${complexTarget} with ${assignment}\n`;
            } else {
                result = `annotate ${rootElementName} with {\n${childSegments[0]} ${assignment}};\n`;
            }
        }
    }

    result = indent(result);
    return result;
};

export interface PrintOptions {
    indentResult: boolean;

    /**
     * Used to build prefix for annotation terms on annotations and record properties.
     */
    annotationContext: Element[];
}

/**
 * Get print options replacing missing values with defaults.
 *
 * @param printOptions - Options for printing.
 * @returns The complete print options with defaults applied.
 */
function getPrintOptions(printOptions: Partial<PrintOptions>): PrintOptions {
    return {
        indentResult: printOptions.indentResult ?? true,

        annotationContext: printOptions.annotationContext ?? []
    };
}
export const print = (
    node: Element | TextNode | (Element | TextNode)[],
    formatterOptions: FormatterOptions = defaultPrintOptions,
    printOptions: Partial<PrintOptions> = {}
): string => {
    const { indentResult, annotationContext } = getPrintOptions(printOptions);
    if (Array.isArray(node)) {
        const nodes = node;
        const withTrailingCommas = nodes
            .map((item: Element | TextNode) => printCsdlNode(item, annotationContext, formatterOptions) + ',')
            .join('\n');
        return indentResult ? indent(withTrailingCommas) : withTrailingCommas;
    }
    return indentResult
        ? indent(printCsdlNode(node, annotationContext, formatterOptions))
        : printCsdlNode(node, annotationContext, formatterOptions);
};

const internalPrint = (node: Element | TextNode, options: FormatterOptions): string[] => {
    if (node.type === ELEMENT_TYPE && node.name === Edm.Annotation) {
        return printNonRecordNode(node, [], options);
    }
    return [printCsdlNode(node, [], options)];
};

const escapeText = (input: string): string => {
    if (!input || typeof input !== 'string') {
        return input;
    }
    return input.replace(/'/g, "''");
};

export const printCsdlNode = (node: Element | TextNode, context: Element[], options: FormatterOptions): string => {
    switch (node.type) {
        case ELEMENT_TYPE:
            if (node.name === Edm.Record) {
                return printRecord(node, [], options);
            } else {
                return printNonRecordNode(node, context, options).join(',\n');
            }
        case TEXT_TYPE:
            // text nodes can have all kinds of primitive values which might need enclosing '' or not (e.g. true, false, paths)
            return escapeText(node.text);
        default:
            return '';
    }
};

const printNonRecordNode = (node: Element, context: Element[], options: FormatterOptions): string[] => {
    const value = printNonRecordValue(node, context, options);
    if (node.name === Edm.Annotation || node.name === Edm.PropertyValue) {
        // Annotation and PropertyValue need special handling because they also include 'key' part of the key value pair
        const annotations = flattenAnnotations(node, context, options);
        const key = printKey([...context, node]);
        return [value === undefined ? keyAlone(key) : valuePair(key, value), ...annotations];
    }
    return [value];
};

const printAnnotationTerm = (element: Element, embedded: boolean, isLastSegment: boolean): string => {
    const term = getElementAttributeValue(element, Edm.Term);
    const qualifier = getElementAttributeValue(element, Edm.Qualifier);
    if (!term) {
        return '';
    }

    const embeddedPrefix = embedded ? '@' : '';
    if (qualifier) {
        if (!isLastSegment) {
            return delimitedIdentifier(`${embeddedPrefix}${term}#${qualifier}`);
        }
        return `${embeddedPrefix}${term} #${qualifier}`;
    } else {
        return embeddedPrefix + term;
    }
};

const flattenAnnotations = (node: Element, context: Element[], options: FormatterOptions): string[] => {
    const annotations = (node.content ?? []).filter(annotationFilter);
    if (annotations.length) {
        return annotations.flatMap((annotation) => printNonRecordNode(annotation, [...context, node], options));
    }
    return [];
};

/**
 * Flatten OData structure into a CDS key.
 *
 * @param context - Annotation elements
 * @returns The key string
 */
export const printKey = (context: Element[]): string => {
    return context
        .map((element, i) => {
            if (element.name === Edm.Annotation) {
                return printAnnotationTerm(
                    element,
                    i !== 0,
                    i === context.length - 1 && (i !== 0 || context.length === 1)
                );
            } else if (element.name === Edm.PropertyValue) {
                const propertyName = getElementAttributeValue(element, Edm.Property);
                if (!propertyName) {
                    return '';
                }
                return propertyName;
            }
            return '';
        })
        .filter((segment) => segment !== '')
        .join('.');
};

const printContainerNode =
    (context: Element[], options: FormatterOptions) =>
    (node: Element | TextNode): ContainerItemType => {
        const value = printCsdlNode(node, context, options);
        if (options.useSnippetSyntax && value.startsWith('$')) {
            return {
                placeholder: true,
                value
            };
        }
        return value;
    };

const printNonRecordValue = (node: Element, context: Element[], options: FormatterOptions): string => {
    switch (node.name) {
        case Edm.Annotation:
        case Edm.PropertyValue: {
            return printValue(node, context, options) as string;
        }
        case Edm.Collection: {
            const items = (node.content ?? [])
                .filter((node) => node.type === ELEMENT_TYPE || node.text.trim() !== '')
                .map(printContainerNode(context, options));
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
                            : printCsdlNode(nodeContent, context, options)
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

const annotationFilter = (node: Element | TextNode): node is Element =>
    node.type === ELEMENT_TYPE && node.name === Edm.Annotation;

const encodeSnippet = (options: FormatterOptions, text: string): string =>
    options.useSnippetSyntax ? text.replace(/\$/g, '\\$') : text;

const printValue = (element: Element, context: Element[], options: FormatterOptions): string | undefined => {
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
        return printCsdlNode(valueElement, context, options);
    }
    const primitiveAttributeValue = printAttributePrimitiveValue(element);
    if (primitiveAttributeValue) {
        return primitiveAttributeValue;
    }
    return undefined;
};

const printRecord = (element: Element, context: Element[], options: FormatterOptions): string => {
    const content = element.content ?? [];
    const skipTextNodes =
        content.find((child) => child.type === ELEMENT_TYPE && child.name !== Edm.Annotation) !== undefined;

    const properties = content
        .filter(
            (child) =>
                (!skipTextNodes && child.type !== ELEMENT_TYPE) ||
                (child.type === ELEMENT_TYPE && child.name !== Edm.Annotation)
        )
        .map(printContainerNode(context, options));
    const annotations = content
        .filter(annotationFilter)
        .flatMap((annotation: Element) => printNonRecordNode(annotation, [...context, element], options));
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
            if (expressionValue.trim() === '') {
                result = stringLiteral(expressionValue);
            } else {
                result = printPathValue(expressionValue);
            }
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
