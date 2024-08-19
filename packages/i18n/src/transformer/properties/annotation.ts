import { Range } from '@sap-ux/text-document-utils';
import type { I18nAnnotationNode, ValueNode, SapTextType, TextNode } from './../../types';
import type { CommentLine, PropertyLine } from '../../parser/properties/types';

/**
 * Convert text to value node with range information.
 *
 * @param comment comment
 * @param commaIndex comma index
 * @param colonIndex colon index
 * @returns value node with range info
 */
function toTextTypeNode(comment: CommentLine, commaIndex: number, colonIndex: number): ValueNode<SapTextType> {
    const {
        range: { start },
        value
    } = comment;
    // Comments can only be single line, so start and end lines will be equal
    if (commaIndex !== -1) {
        return {
            value: value.slice(1, commaIndex) as SapTextType,
            range: Range.create(start.line, start.character, start.line, start.character + commaIndex)
        };
    }
    if (colonIndex !== -1) {
        return {
            value: value.slice(1, colonIndex) as SapTextType,
            range: Range.create(start.line, start.character + 1, start.line, start.character + colonIndex)
        };
    }

    return {
        value: value.slice(1) as SapTextType,
        range: Range.create(start.line, start.character, start.line, start.character + value.length)
    };
}

/**
 * Convert text to value node with range information.
 *
 * @param comment comment
 * @param commaIndex comma index
 * @param colonIndex colon index
 * @returns value node with range info
 */
function toMaxLength(comment: CommentLine, commaIndex: number, colonIndex: number): ValueNode<number> | undefined {
    if (commaIndex === -1) {
        return undefined;
    }
    const {
        range: { start },
        value
    } = comment;
    return {
        value: parseInt(value.slice(commaIndex + 1, colonIndex === -1 ? undefined : colonIndex), 10),
        range: Range.create(
            start.line,
            start.character + commaIndex + 1,
            start.line,
            start.character + (colonIndex === -1 ? value.length : colonIndex)
        )
    };
}

/**
 * Convert comment to note node with range info.
 *
 * @param comment comment
 * @param colonIndex colon index
 * @returns note node with range info
 */
function toNote(comment: CommentLine, colonIndex: number): TextNode | undefined {
    if (colonIndex === -1) {
        return undefined;
    }
    const {
        range: { start },
        value
    } = comment;
    return {
        value: value.slice(colonIndex + 1),
        range: Range.create(start.line, start.character + colonIndex + 1, start.line, start.character + value.length)
    };
}

/**
 * Get i18n annotation.
 *
 * @param commentLine comment line
 * @returns annotation node
 */
export function getAnnotation(commentLine: PropertyLine | undefined): I18nAnnotationNode | undefined {
    if (commentLine?.type !== 'comment-line') {
        return undefined;
    }
    const { value } = commentLine;
    const commaIndex = value.indexOf(',');
    const colonIndex = value.indexOf(':');
    const annotation: I18nAnnotationNode = {
        textType: toTextTypeNode(commentLine, commaIndex, colonIndex),
        maxLength: toMaxLength(commentLine, commaIndex, colonIndex),
        note: toNote(commentLine, colonIndex)
    };

    return annotation;
}
