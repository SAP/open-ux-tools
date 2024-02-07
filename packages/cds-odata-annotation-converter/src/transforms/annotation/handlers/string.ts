import type { MultiLineStringLiteral, StringLiteral } from '@sap-ux/cds-annotation-parser';
import { MULTI_LINE_STRING_LITERAL_TYPE, STRING_LITERAL_TYPE, nodeRange } from '@sap-ux/cds-annotation-parser';

import type { Element } from '@sap-ux/odata-annotation-core-types';
import { MultilineType, createElementNode, createTextNode, Edm } from '@sap-ux/odata-annotation-core-types';

import type { NodeHandler } from '../handler';
import type { VisitorState } from '../visitor-state';
import { pathLikeTypeElementName, unescapeText } from '../path-utils';

export const stringHandler: NodeHandler<StringLiteral> = {
    type: STRING_LITERAL_TYPE,
    convert: convertString
};

export const multiLineStringHandler: NodeHandler<MultiLineStringLiteral> = {
    type: MULTI_LINE_STRING_LITERAL_TYPE,
    convert: convertString
};

/**
 * Converts a string literal or multiline string literal node to an Element.
 *
 * @param state - The visitor state.
 * @param node - The string or multiline string literal node.
 * @returns The converted Element or undefined if the conversion is not performed.
 */
function convertString(state: VisitorState, node: StringLiteral | MultiLineStringLiteral): Element | undefined {
    const elementName = pathLikeTypeElementName(state.context.valueType) ?? Edm.String;

    const element: Element = createElementNode({
        name: elementName,
        range: nodeRange(node, true),
        contentRange: nodeRange(node, false),
        content: [createTextNode(unescapeText(node.value), nodeRange(node, false), undefined, getMultiLineType(node))]
    });

    if (elementName !== Edm.String) {
        state.addPath(node.value);
    } else if (state.context.propertyName === 'Action') {
        // Assuming that this string is content for property Action of UI.DataFieldForAction
        // --> add value as absolute path to trigger collection of function/action metadata
        state.addPath('/' + node.value);
    } else if (state.context.propertyName === 'TargetProperties') {
        state.addPath(node.value);
    }

    return element;
}

/**
 * Determines the multiline type based on the provided string or multiline string literal node.
 *
 * @param node - The string or multiline string literal node.
 * @returns The determined multiline type, or undefined if the node is not a multiline string literal.
 */
function getMultiLineType(node: StringLiteral | MultiLineStringLiteral): MultilineType | undefined {
    if (node.type === STRING_LITERAL_TYPE) {
        return undefined;
    }
    return node.stripIndentation ? MultilineType.StripIndentation : MultilineType.KeepIndentation;
}
