import type { TextDocument } from 'vscode-languageserver-textdocument';

import { getIndentLevel, indent, isBefore, rangeContained } from '@sap-ux/odata-annotation-core';
import type { Element } from '@sap-ux/odata-annotation-core-types';
import { copyPosition, copyRange } from '@sap-ux/cds-annotation-parser';
import {
    createElementNode,
    Position,
    printOptions as defaultPrintOptions,
    TextEdit,
    Range,
    EDMX_NAMESPACE_ALIAS,
    EDM_NAMESPACE_ALIAS
} from '@sap-ux/odata-annotation-core-types';
import {
    printCsdlNodeToXmlString,
    transformRange,
    escapeAttribute,
    EDMX_V4_NAMESPACE,
    EDM_V4_NAMESPACE
} from '@sap-ux/xml-odata-annotation-converter';
import type { SourcePosition, XMLAstNode, XMLAttribute, XMLDocument, XMLElement } from '@xml-tools/ast';
import { DEFAULT_NS } from '@xml-tools/ast';

import { compareByRange } from '../utils';
import type { Comment } from './comments';
import type {
    DeleteAttribute,
    DeleteElement,
    InsertAttribute,
    InsertElement,
    MoveCollectionValue,
    ReplaceElement,
    ReplaceElementContent,
    UpdateAttributeName,
    UpdateAttributeValue,
    UpdateElementName,
    XMLDocumentChange
} from './changes';
import { REPLACE_ELEMENT_CONTENT } from './changes';
import { getNodeFromPointer } from './pointer';

const printOptions: typeof defaultPrintOptions = { ...defaultPrintOptions, useSnippetSyntax: false };

/**
 * Translates changes objects to XML text edits.
 */
export class XMLWriter {
    private readonly changes: XMLDocumentChange[] = [];
    private readonly elementContentCache = new Map<XMLElement, ElementContent[]>();

    /**
     *
     * @param document - XMLDocument AST node.
     * @param comments - Array of all the comments in the document.
     * @param textDocument - TextDocument instance.
     */
    constructor(private document: XMLDocument, private comments: Comment[], private textDocument: TextDocument) {}
    /**
     *  Adds a new change to the change stack.
     *
     * @param change - Change to be added to the stack.
     */
    public addChange(change: XMLDocumentChange): void {
        this.changes.push(change);
    }

    /**
     * Transforms changes in the stack to text edits.
     *
     * @returns TextEdits.
     */
    public getTextEdits(): TextEdit[] {
        const edits: TextEdit[] = [];
        const changes = preprocessChanges(this.changes, this.document);
        const batches = getBatches(changes);
        for (const pointer of Object.keys(batches)) {
            edits.push(...this.getTextEditsForPointer(pointer, batches[pointer]));
        }
        edits.sort(compareByRange);
        return edits;
    }

    private getContent(element: XMLElement): ElementContent[] {
        let content = this.elementContentCache.get(element);
        if (!content) {
            content = getElementContent(element, this.comments);
            this.elementContentCache.set(element, content);
        }
        return content;
    }

    private getTextEditsForPointer(
        pointer: string,
        byType: Map<XMLDocumentChange['type'], XMLDocumentChange[]>
    ): TextEdit[] {
        const edits: TextEdit[] = [];
        const element = getNodeFromPointer(this.document, pointer);
        const childIndentLevel = getIndentFromElement(element);

        const inserts = (byType.get('insert-element') ?? []) as InsertElement[];
        const insertEdits = convertInsertElementToTextEdits(
            this.comments,
            element as XMLElement,
            inserts,
            childIndentLevel
        );
        edits.push(...insertEdits);

        const elementNameUpdates = (byType.get('update-element-name') ?? []) as UpdateElementName[];
        edits.push(...convertUpdateElementNameToTextEdits(elementNameUpdates, element));

        switch (element?.type) {
            case 'XMLElement': {
                const elementChanges = {
                    replacements: (byType.get('replace-element') ?? []) as ReplaceElement[],
                    contentReplacements: (byType.get(REPLACE_ELEMENT_CONTENT) ?? []) as ReplaceElementContent[],
                    elementDeletions: (byType.get('delete-element') ?? []) as DeleteElement[],
                    attributeInserts: (byType.get('insert-attribute') ?? []) as InsertAttribute[],
                    moveInCollection: (byType.get('move-collection-value') ?? []) as MoveCollectionValue[]
                };
                edits.push(...this.handleXmlElementChanges(elementChanges, element, pointer, childIndentLevel));
                break;
            }
            case 'XMLAttribute': {
                const attributeChanges = {
                    attributeDeletions: (byType.get('delete-attribute') ?? []) as DeleteAttribute[],
                    attributeNameUpdates: (byType.get('update-attribute-name') ?? []) as UpdateAttributeName[],
                    attributeValueUpdates: (byType.get('update-attribute-value') ?? []) as UpdateAttributeValue[]
                };
                edits.push(...handleXmlAttributeChanges(attributeChanges, element));
                break;
            }
            default:
                break;
        }
        return edits;
    }

    private handleXmlElementChanges(
        elementChanges: {
            replacements: ReplaceElement[];
            contentReplacements: ReplaceElementContent[];
            elementDeletions: DeleteElement[];
            attributeInserts: InsertAttribute[];
            moveInCollection: MoveCollectionValue[];
        },
        element: XMLElement,
        pointer: string,
        childIndentLevel: number
    ) {
        const edits: TextEdit[] = [];
        const { replacements, contentReplacements, elementDeletions, attributeInserts, moveInCollection } =
            elementChanges;
        if (elementDeletions.length > 0) {
            const parent = element.parent;
            const content = parent.type === 'XMLElement' ? this.getContent(parent) : [];
            edits.push(...handleXmlElementDeletions(parent, pointer, content, element));
        } else if (replacements.length > 0) {
            edits.push(...handleXmlElementReplacements(element, replacements, childIndentLevel));
        } else if (contentReplacements.length > 0) {
            edits.push(...handleXmlElementContentReplacements(element, contentReplacements, childIndentLevel));
        } else if (moveInCollection.length > 0) {
            for (const moveChange of moveInCollection) {
                const insertPosition = findInsertPositionForMove(moveChange.index, element, this.comments);
                if (!insertPosition) {
                    continue;
                }
                const { textEdits, text } = this.prepareXmlElementMoveChange(moveChange);
                edits.push(...textEdits);
                edits.push(...handleXmlElementMoveChange(element, childIndentLevel, text, insertPosition));
            }
        } else {
            edits.push(...handleXmlElementAttributeInserts(element, attributeInserts));
        }
        return edits;
    }

    private prepareXmlElementMoveChange(moveChange: MoveCollectionValue): {
        textEdits: TextEdit[];
        text: string[];
    } {
        const textEdits: TextEdit[] = [];
        const ranges = createElementRanges(this.document, moveChange.fromPointers);
        const text: string[] = [];
        for (const { parent, start, end } of ranges) {
            const content = this.getContent(parent);
            const range = getRangeForMove(content, parent, start, end);
            if (!range) {
                continue;
            }
            text.push(this.textDocument.getText(range));
            textEdits.push(TextEdit.del(range));
        }
        return { textEdits, text };
    }
}

function handleXmlAttributeChanges(
    attributeChanges: {
        attributeDeletions: DeleteAttribute[];
        attributeNameUpdates: UpdateAttributeName[];
        attributeValueUpdates: UpdateAttributeValue[];
    },
    element: XMLAttribute
): TextEdit[] {
    const edits: TextEdit[] = [];
    const { attributeDeletions, attributeNameUpdates, attributeValueUpdates } = attributeChanges;
    if (attributeDeletions.length > 0) {
        const attributeRange = transformRange(element.position);
        if (attributeRange) {
            // There must be a space character before attribute and we should remove it with attribute.
            attributeRange.start.character--;
            edits.push(TextEdit.del(attributeRange));
        }
    } else {
        // if attribute is deleted, then we can ignore updates
        const nameRange = transformRange(element.syntax.key);
        if (nameRange && attributeNameUpdates.length > 0) {
            const newName = attributeNameUpdates[attributeNameUpdates.length - 1].newName;
            edits.push(TextEdit.replace(nameRange, newName));
        }

        const valueRange = transformRange(element.syntax.value);
        if (valueRange && attributeValueUpdates.length > 0) {
            const newValue = attributeValueUpdates[attributeValueUpdates.length - 1].newValue;
            // shift from start quote
            valueRange.start.character++;
            // shift from end quote
            valueRange.end.character--;
            edits.push(TextEdit.replace(valueRange, newValue));
        }
    }
    return edits;
}

function handleXmlElementAttributeInserts(element: XMLElement, attributeInserts: InsertAttribute[]): TextEdit[] {
    const openTagRange = transformRange(element.syntax.openBody);
    if (!openTagRange) {
        return [];
    }
    const edits: TextEdit[] = [];
    const byIndex = new Map<number | undefined, InsertAttribute[]>();
    for (const change of attributeInserts) {
        let insertsAtIndex = byIndex.get(change.index);
        if (!insertsAtIndex) {
            insertsAtIndex = [];
            byIndex.set(change.index, insertsAtIndex);
        }
        insertsAtIndex.push(change);
    }
    for (const [key, inserts] of byIndex.entries()) {
        const attributes: string[] = [];
        const position = getAttributeInsertPosition(element, openTagRange, key);
        if (!position) {
            // TODO: report error
            continue;
        }
        for (const attributeInsert of inserts) {
            // insert before open tag
            attributes.push(`${attributeInsert.name}="${escapeAttribute(attributeInsert.value)}"`);
        }
        if (attributes.length > 0) {
            const text = ` ${attributes.join(' ')}`;
            edits.push(TextEdit.insert(position, text));
        }
    }
    return edits;
}

function getTextFragmentOffset(text: string): number {
    const lines = text.split('\n');
    const linesWithTextIndices = lines.map((line, idx) => (line.length > 0 ? idx : -1));
    const indentTextIndex = linesWithTextIndices.find((idx) => idx > -1);
    if (indentTextIndex === undefined) {
        return 0;
    }
    const indentLineText = lines[indentTextIndex];
    return indentLineText.length - indentLineText.trimStart().length;
}

function adjustFragmentIndentation(text: string, requiredIndent: number): string {
    const requiredOffset = requiredIndent * 4;
    const actual = getTextFragmentOffset(text);
    if (actual == requiredOffset) {
        return text;
    }
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
        if (line.length) {
            if (actual < requiredOffset) {
                line = ' '.repeat(requiredOffset - actual) + line;
            } else if (line.startsWith(' '.repeat(actual - requiredOffset))) {
                line = line.substring(' '.repeat(actual - requiredOffset).length);
            } else {
                line = line.trim();
            }

            lines[idx] = line;
        }
    });
    return lines.join('\n');
}

function handleXmlElementMoveChange(
    element: XMLElement,
    childIndentLevel: number,
    text: string[],
    insertPosition: Position
): TextEdit[] {
    const edits: TextEdit[] = [];
    const openTagRange = transformRange(element.syntax.openBody);
    const textWithNewIndentation = adjustFragmentIndentation(text.join(''), childIndentLevel);
    if (element.syntax.isSelfClosing && openTagRange) {
        const indent = '    '.repeat(childIndentLevel - 1);
        edits.push(
            TextEdit.replace(
                Range.create(
                    openTagRange.end.line,
                    openTagRange.end.character - 2,
                    openTagRange.end.line,
                    openTagRange.end.character
                ),
                `>${textWithNewIndentation}\n${indent}</${element.name}>`
            )
        );
    } else {
        edits.push(TextEdit.insert(insertPosition, textWithNewIndentation));
    }
    return edits;
}

function handleXmlElementContentReplacements(
    element: XMLElement,
    contentReplacements: ReplaceElementContent[],
    childIndentLevel: number
): TextEdit[] {
    const edits: TextEdit[] = [];
    const openTagRange = transformRange(element.syntax.openBody);
    const closeTagRange = transformRange(element.syntax.closeBody);
    const lastChange = contentReplacements.slice(-1)[0];
    const namespaceMap = getNamespaceMap(element);
    const text = replaceElementContentToText(lastChange, childIndentLevel - 1, namespaceMap);
    if (element.syntax.isSelfClosing && openTagRange) {
        edits.push(
            TextEdit.replace(
                Range.create(
                    openTagRange.end.line,
                    openTagRange.end.character - 2,
                    openTagRange.end.line,
                    openTagRange.end.character
                ),
                `>${text}</${element.name}>`
            )
        );
    } else if (openTagRange && closeTagRange) {
        edits.push(TextEdit.replace(Range.create(openTagRange.end, closeTagRange.start), text));
    }
    return edits;
}

function handleXmlElementReplacements(
    element: XMLElement,
    replacements: ReplaceElement[],
    childIndentLevel: number
): TextEdit[] {
    const edits: TextEdit[] = [];
    const openTagRange = transformRange(element.syntax.openBody);
    const closeTagRange = transformRange(element.syntax.closeBody);
    const lastChange = replacements.slice(-1)[0];
    const namespaceMap = getNamespaceMap(element);
    const text = replaceElementToText(lastChange, childIndentLevel - 1, namespaceMap);
    if (element.syntax.isSelfClosing && openTagRange) {
        edits.push(TextEdit.replace(openTagRange, text));
    } else if (openTagRange && closeTagRange) {
        edits.push(TextEdit.replace(Range.create(openTagRange.start, closeTagRange.end), text));
    }
    return edits;
}

function handleXmlElementDeletions(
    parent: XMLDocument | XMLElement,
    pointer: string,
    content: ElementContent[],
    element: XMLElement
): TextEdit[] {
    const edits: TextEdit[] = [];
    const openTagRange = transformRange(element.syntax.openBody);
    if (parent.type === 'XMLElement') {
        const index = parseInt(pointer.split('/').slice(-1)[0], 10);
        const { previousContentIndex, startContentIndex } = findContentIndices(index, index, content);

        const anchor = getStartAnchor(content, parent, previousContentIndex, startContentIndex);
        if (anchor) {
            const previousElement = content[previousContentIndex];
            const nextElement = content.find((item, i) => item.type === 'element' && i > startContentIndex);
            const parentCloseTagRange = transformRange(parent.syntax.closeBody);

            if (!nextElement && !previousElement && parentCloseTagRange) {
                updatePosition(anchor.end, parentCloseTagRange.start);
            }
            edits.push(TextEdit.del(anchor));
        }
    } else if (element.syntax.isSelfClosing && openTagRange) {
        // empty root element
        edits.push(TextEdit.del(openTagRange));
    } else {
        // root element with content
        const closeTagRange = transformRange(element.syntax.closeBody);
        if (openTagRange && closeTagRange) {
            edits.push(TextEdit.del(Range.create(openTagRange.start, closeTagRange.end)));
        }
    }
    return edits;
}

function convertUpdateElementNameToTextEdits(
    elementNameUpdates: UpdateElementName[],
    element: XMLAstNode | undefined
): TextEdit[] {
    const edits: TextEdit[] = [];
    if (elementNameUpdates.length > 0 && element?.type === 'XMLElement') {
        const newName = elementNameUpdates[elementNameUpdates.length - 1].newName;
        const openTagRange = transformRange(element.syntax.openBody);
        const closeTagRange = transformRange(element.syntax.closeBody);
        if (openTagRange) {
            const nameLength = element.name?.length ?? 0;
            openTagRange.start.character++; // <
            openTagRange.end.character = openTagRange.start.character + nameLength;
            edits.push(TextEdit.replace(openTagRange, newName));
            if (closeTagRange) {
                closeTagRange.start.character += 2; // </
                closeTagRange.end.character--; // >
                edits.push(TextEdit.replace(closeTagRange, newName));
            }
        }
    }
    return edits;
}

function getBatches(changes: XMLDocumentChange[]): {
    [pointer: string]: Map<XMLDocumentChange['type'], XMLDocumentChange[]>;
} {
    const batches: { [pointer: string]: Map<XMLDocumentChange['type'], XMLDocumentChange[]> } = {};
    for (const change of changes) {
        let byTypeMap = batches[change.pointer];
        if (!byTypeMap) {
            byTypeMap = new Map();
            batches[change.pointer] = byTypeMap;
        }
        let batch = byTypeMap.get(change.type);
        if (!batch) {
            batch = [];
            byTypeMap.set(change.type, batch);
        }
        batch.push(change);
    }
    return batches;
}

function getAttributeInsertPosition(
    element: XMLElement,
    openTagRange: Range,
    index: number | undefined
): Position | undefined {
    if (index === undefined) {
        // /> or >
        const characterOffset = element.syntax.isSelfClosing === true ? 2 : 1;
        return Position.create(openTagRange.end.line, openTagRange.end.character - characterOffset);
    }
    const attribute = element.attributes[index];
    if (!attribute) {
        return undefined;
    }
    const range = transformRange(attribute.position);

    if (!range) {
        return undefined;
    }
    // There must be a space character before attribute and the insert position should be before it
    return Position.create(range.start.line, range.start.character - 1);
}

function convertInsertElementToTextEdits(
    comments: Comment[],
    element: XMLElement | undefined,
    changes: InsertElement[],
    childIndentLevel: number
): TextEdit[] {
    if (!(element === undefined || element.type === 'XMLElement')) {
        return [];
    }
    if (changes.length === 0) {
        return [];
    }

    if (!element) {
        const change = changes.slice(-1)[0];
        const namespaceMap = getNamespaceMapForNewRootNode(change.element);
        const newElements = insertElementToText([change], childIndentLevel, namespaceMap);
        return [TextEdit.insert(Position.create(0, 0), newElements)];
    } else {
        const namespaceMap = getNamespaceMap(element);
        const openTagRange = transformRange(element.syntax.openBody);
        if (element.syntax.isSelfClosing && openTagRange) {
            const newElements = insertElementToText(changes, childIndentLevel, namespaceMap);
            const fragments: string[] = ['>', '\n', newElements];
            fragments.push('\n');
            const indentLevel = childIndentLevel > 0 ? childIndentLevel - 1 : 0;
            const indent = '    '.repeat(indentLevel);
            fragments.push(`${indent}</${element.name}>`);
            return [
                TextEdit.replace(
                    Range.create(
                        openTagRange.end.line,
                        openTagRange.end.character - 2,
                        openTagRange.end.line,
                        openTagRange.end.character
                    ),
                    fragments.join('')
                )
            ];
        } else {
            return insertIntoElementWithContent(comments, element, changes, childIndentLevel, namespaceMap);
        }
    }
}

function insertIntoElementWithContent(
    comments: Comment[],
    element: XMLElement,
    changes: InsertElement[],
    childIndentLevel: number,
    namespaceMap: Record<string, string>
): TextEdit[] {
    const edits: TextEdit[] = [];
    const [indices, changesByIndex] = indexInserts(changes);

    for (const index of indices) {
        const changeSet = changesByIndex.get(index);
        if (!changeSet) {
            continue;
        }

        const anchor = findInsertPosition(comments, element, index ?? -1);
        if (anchor.type === 'none') {
            continue;
        }

        const fragments: string[] = [];
        if (element.syntax.openBody?.endLine === element.syntax.closeBody?.startLine && !anchor.requiresNewLine) {
            fragments.push('\n');
        }

        const newElements = insertElementToText(changeSet, childIndentLevel, namespaceMap) + '\n';
        if (anchor.requiresNewLine) {
            fragments.push('\n');
        }
        fragments.push(newElements);
        if (!anchor.requiresNewLine) {
            edits.push(TextEdit.insert(anchor.position, fragments.join('')));
            continue;
        }
        const childIndent = indent(printOptions.tabWidth, printOptions.useTabs, childIndentLevel);
        fragments.push(childIndent);
        if (anchor.redundantWhitespace) {
            edits.push(TextEdit.del(anchor.redundantWhitespace));
        }
        edits.push(TextEdit.insert(anchor.position, fragments.join('')));
    }
    return edits;
}

function indexInserts(changes: InsertElement[]): [(number | undefined)[], Map<number | undefined, InsertElement[]>] {
    const changesByIndex = new Map<number | undefined, InsertElement[]>();
    const indices: (number | undefined)[] = [];
    for (const change of changes) {
        let changeSet = changesByIndex.get(change.index);
        if (!changeSet) {
            changeSet = [];
            indices.push(change.index);
            changesByIndex.set(change.index, changeSet);
        }
        changeSet.push(change);
    }
    return [indices, changesByIndex];
}

function insertElementToText(
    inserts: InsertElement[],
    childIndentLevel: number,
    namespaceMap: Record<string, string>
): string {
    return inserts
        .map((change) =>
            printCsdlNodeToXmlString(createElementNode(change.element), printOptions, {
                namespaces: namespaceMap,
                cursorIndentLevel: childIndentLevel
            })
        )
        .join('\n');
}

function replaceElementToText(
    change: ReplaceElement,
    childIndentLevel: number,
    namespaceMap: Record<string, string>
): string {
    return printCsdlNodeToXmlString(createElementNode(change.newElement), printOptions, {
        namespaces: namespaceMap,
        cursorIndentLevel: childIndentLevel
    }).trim();
}

function replaceElementContentToText(
    change: ReplaceElementContent,
    childIndentLevel: number,
    namespaceMap: Record<string, string>
): string {
    return printCsdlNodeToXmlString(change.newValue, printOptions, {
        namespaces: namespaceMap,
        cursorIndentLevel: childIndentLevel
    }).trim();
}

function findInsertPosition(
    comments: Comment[],
    element: XMLElement,
    index = -1
):
    | { position: Position; type: 'parent' | 'child'; requiresNewLine: boolean; redundantWhitespace?: Range }
    | { type: 'none' } {
    const child = index !== -1 ? element.subElements[index] : undefined;

    if (child) {
        const childRange = sourcePositionToRange(child.position);
        // keep associated comments with element together
        const comment = findComment(comments, childRange);
        const startAnchorRange = findStartAnchorRange(element, index);
        if (!startAnchorRange) {
            return { type: 'none' };
        }
        const anchorPosition = comment ? comment.range.start : childRange.start;
        const requiresNewLine = anchorPosition.line === startAnchorRange.end.line;
        // If we are not on the same line as the starting anchor,
        // then it means there should be only whitespace until the start of the line
        // and we can insert the snippet there
        const position = requiresNewLine ? anchorPosition : Position.create(anchorPosition.line, 0);
        const redundantWhitespace = requiresNewLine ? Range.create(startAnchorRange.end, anchorPosition) : undefined;
        return { type: 'child', position, requiresNewLine, redundantWhitespace };
    }
    const closeTagRange = transformRange(element.syntax.closeBody);
    const startAnchorRange = findStartAnchorRange(element, element.subElements.length);
    if (closeTagRange && startAnchorRange) {
        const anchorPosition = closeTagRange.start;
        const requiresNewLine = anchorPosition.line === startAnchorRange.end.line;
        const position = requiresNewLine ? anchorPosition : Position.create(anchorPosition.line, 0);
        return { type: 'parent', position, requiresNewLine: false };
    }
    return { type: 'none' };
}

/**
 * Finds a closest boundary structure before the given element and returns its range.
 * It could be either another sibling element or an opening tag of a parent.
 *
 * @param parent - Parent element.
 * @param index - Current element index.
 * @returns Anchor range.
 */
function findStartAnchorRange(parent: XMLElement, index: number): Range | undefined {
    const previousElement = parent.subElements[index - 1];
    if (index === 0) {
        return transformRange(parent.syntax.openBody);
    }
    if (previousElement) {
        return sourcePositionToRange(previousElement.position);
    }

    return undefined;
}

/**
 * Find comment that is associated with the range.
 * We consider comments right before an element to be associated.
 *
 * @param comments - Documents comments.
 * @param range - Range to which the comment should be associated to.
 * @returns Comment if it exists.
 */
function findComment(comments: Comment[], range: Range): Comment | undefined {
    const previousLine = range.start.line - 1;
    for (const comment of comments) {
        if (comment.range.end.line === previousLine || comment.range.start.line === range.end.line) {
            return comment;
        }
    }
    return undefined;
}

function sourcePositionToRange(position: SourcePosition): Range {
    return Range.create(position.startLine - 1, position.startColumn - 1, position.endLine - 1, position.endColumn);
}

function getIndentFromElement(element: XMLAstNode | undefined): number {
    if (element?.type === 'XMLElement') {
        const openTagRange = transformRange(element.syntax.openBody);

        if (openTagRange) {
            return getIndentLevel(openTagRange.start.character, printOptions.tabWidth) + 1;
        }
    }
    return 0;
}

function createElementRanges(
    document: XMLDocument,
    pointers: string[]
): { parent: XMLElement; start: number; end: number }[] {
    const ranges: { parent: XMLElement; start: number; end: number }[] = [];
    const groups = pointers.reduce((acc, pointer) => {
        const segments = pointer.split('/');
        // remove /subElements/<index> suffix
        const containerPath = segments.slice(0, -2).join('/');
        const index = parseInt(segments.slice(-1)[0], 10);
        const list = acc.get(containerPath);
        if (list) {
            list.push(index);
        } else {
            acc.set(containerPath, [index]);
        }
        return acc;
    }, new Map<string, number[]>());

    for (const [containerPath, indices] of groups) {
        const parent = getNodeFromPointer(document, containerPath);
        if (parent?.type === 'XMLElement') {
            indices.sort((index1, index2) => index1 - index2);
            for (let i = 1, start = indices[0], end = indices[0]; i <= indices.length; i++) {
                const current = indices[i];
                if (current === undefined) {
                    // end of collection
                    ranges.push({ parent, start, end });
                } else if (end + 1 === current) {
                    // indices are in sequence -> merge
                    end = current;
                } else {
                    // there is a gap between indices -> create a range
                    ranges.push({ parent, start, end });
                    start = end = current;
                }
            }
        }
    }
    return ranges;
}

interface ElementWithComments {
    type: 'element';
    leadingComment?: Comment;
    trailingComment?: Comment;
    element: XMLElement;
    elementRange: Range;
    range: Range;
}

type ElementContent = ElementWithComments | Comment;

function getElementContent(element: XMLElement, comments: Comment[]): ElementContent[] {
    const range = transformRange(element.position);
    if (!range) {
        return [];
    }
    const commentsInContent = comments.filter((comment) => isCommentInContent(range, comment, element));
    const source = [...element.subElements, ...commentsInContent].sort(compareRange);
    const content: ElementContent[] = [];
    for (let i = 0; i < source.length; i++) {
        const item = source[i];
        if (item.type !== 'XMLElement') {
            content.push(item);
            continue;
        }
        const range = transformRange(item.position);
        if (!range) {
            continue;
        }
        const element: ElementWithComments = {
            type: 'element',
            element: item,
            elementRange: range,
            range: copyRange(range)
        };
        const previousItem = content[content.length - 1];
        const previousLine = element.range.start.line - 1;
        if (
            previousItem?.type === 'comment' &&
            (previousItem.range.end.line === previousLine || previousItem.range.end.line === element.range.start.line)
        ) {
            // typescript can't infer that content.pop() === previousItem
            element.leadingComment = content.pop() as Comment;
            updatePosition(element.range.start, previousItem.range.start);
        }
        const nextItem = source[i + 1];
        if (nextItem?.type === 'comment' && nextItem.range.start.line === range.end.line) {
            element.trailingComment = nextItem;
            updatePosition(element.range.end, nextItem.range.end);
            i++;
        }
        content.push(element);
    }
    return content;
}

function isCommentInContent(range: Range, comment: Comment, element: XMLElement): boolean {
    return (
        rangeContained(range, comment.range) &&
        !element.subElements.some((item) => {
            const subElementRange = transformRange(item.position);
            if (!subElementRange) {
                return false;
            }
            return rangeContained(subElementRange, comment.range);
        })
    );
}

function compareRange<T extends { range?: Range; syntax?: XMLElement['syntax'] }>(a: T, b: T): number {
    const aRange = a.range ?? transformRange(a.syntax?.closeBody ?? a.syntax?.openBody);
    const bRange = b.range ?? transformRange(b.syntax?.closeBody ?? b.syntax?.openBody);
    if (!aRange) {
        return 1;
    }
    if (!bRange) {
        return -1;
    }
    if (isBefore(aRange.start, bRange.start)) {
        return -1;
    } else if (isBefore(bRange.start, aRange.start)) {
        return 1;
    }
    return 0;
}

function findContentIndices(
    start: number,
    end: number,
    content: ElementContent[]
): {
    previousContentIndex: number;
    startContentIndex: number;
    endContentIndex: number;
} {
    let previousContentIndex = -1;
    let startContentIndex = -1;
    let endContentIndex = -1;

    for (let index = 0, contentIndex = 0; index < content.length; index++) {
        const element = content[index];
        if (element.type === 'element') {
            if (start - 1 === contentIndex) {
                previousContentIndex = index;
            }
            if (start === contentIndex) {
                startContentIndex = index;
            }
            if (end === contentIndex) {
                endContentIndex = index;
                break;
            }
            contentIndex++;
        }
    }
    return {
        previousContentIndex,
        startContentIndex,
        endContentIndex
    };
}

function getRangeForMove(content: ElementContent[], parent: XMLElement, start: number, end: number): Range | undefined {
    const { previousContentIndex, startContentIndex, endContentIndex } = findContentIndices(start, end, content);
    const endElement = content[endContentIndex];

    let startPosition = getStartAnchor(content, parent, previousContentIndex, startContentIndex)?.start;
    let endPosition = endElement?.range?.end;
    if (startPosition) {
        startPosition = copyPosition(startPosition);
    }
    if (endPosition) {
        endPosition = copyPosition(endPosition);
    }
    if (!startPosition || !endElement) {
        return undefined;
    }

    return Range.create(startPosition, endPosition);
}

function getStartAnchor(
    content: ElementContent[],
    parent: XMLElement,
    previous: number,
    index: number
): Range | undefined {
    const previousElement = content[previous];

    let startPosition = index === 0 ? transformRange(parent.syntax.openBody)?.end : previousElement?.range?.end;

    const item = content[index];
    if (startPosition) {
        startPosition = copyPosition(startPosition);
    }
    if (!startPosition || !item) {
        return undefined;
    }
    const previousItem = content[index - 1];
    if (previousItem?.type === 'comment') {
        // multiple comments between previous item and starting item -> ignore them
        updatePosition(startPosition, previousItem.range.end);
    }
    return Range.create(startPosition, copyPosition(item.range.end));
}

function updatePosition(a: Position, b: Position): void {
    a.line = b.line;
    a.character = b.character;
}

function adjustRangeByComments(comments: Comment[], range: Range | undefined): void {
    if (!range) {
        return;
    }
    // find inline comment after planned insert position
    const inlineComments = comments.filter(
        (comment) => comment.range.start.line === range.end.line && comment.range.start.character > range.end.character
    );
    // search the right most inline comment, its end position should be the insertion position
    if (inlineComments.length) {
        let pos = range.end;
        for (const comment of inlineComments) {
            if (comment.range.start.character > pos.character) {
                pos = comment.range.end;
            }
        }
        range.end = pos;
    }
}

function findInsertPositionForMove(
    index: number | undefined,
    element: XMLElement,
    comments: Comment[]
): Position | undefined {
    if (index === 0) {
        const range = transformRange(element.syntax.openBody);
        return range?.end;
    } else if (index === undefined || index >= element.subElements.length) {
        const child = element.subElements[element.subElements.length - 1];
        if (!child) {
            return undefined;
        }
        // self closed elements only have "openBody"
        const range = transformRange(child.syntax.closeBody ?? child.syntax.openBody);
        adjustRangeByComments(comments, range);
        return range?.end;
    } else if (index > 0) {
        const child = element.subElements[index - 1];
        // end of the previous element
        // self closed elements only have "openBody"
        const range = transformRange(child.syntax.closeBody ?? child.syntax.openBody);
        adjustRangeByComments(comments, range);
        return range?.end;
    }
    return undefined;
}

function getNamespaceMap(parent: XMLElement): { [alias: string]: string } {
    const map: { [alias: string]: string } = {};
    for (const alias of Object.keys(parent.namespaces)) {
        if (alias === DEFAULT_NS) {
            continue;
        }
        const namespace = parent.namespaces[alias];
        if (namespace === EDMX_V4_NAMESPACE) {
            map[EDMX_NAMESPACE_ALIAS] = alias;
        } else if (namespace === EDM_V4_NAMESPACE) {
            map[EDM_NAMESPACE_ALIAS] = alias;
        }
    }

    return map;
}

function getNamespaceMapForNewRootNode(element: Element): { [alias: string]: string } {
    const map: { [alias: string]: string } = {};
    for (const attributeName of Object.keys(element.attributes)) {
        if (!attributeName.startsWith('xmlns')) {
            continue;
        }
        const { name, value: namespace } = element.attributes[attributeName];
        const [, alias] = name.split(':');

        if (alias === undefined) {
            continue;
        }

        if (namespace === EDMX_V4_NAMESPACE) {
            map[EDMX_NAMESPACE_ALIAS] = alias;
        } else if (namespace === EDM_V4_NAMESPACE) {
            map[EDM_NAMESPACE_ALIAS] = alias;
        }
    }

    return map;
}

function preprocessChanges(changes: XMLDocumentChange[], document: XMLDocument): XMLDocumentChange[] {
    let result = removeDuplicates(changes);
    result = removeOverlappingDeletes(result);
    result = combineInsertsWithDeletions(result, document);
    return result;
}

function combineInsertsWithDeletions(changes: XMLDocumentChange[], document: XMLDocument): XMLDocumentChange[] {
    const result: XMLDocumentChange[] = [];
    const deletions = new Set<number>();
    const replacements = new Map<number, XMLDocumentChange>();
    // Inserts are usually merged together, so we need to replace the last insert of the batch for the same index
    for (let i = changes.length - 1; i >= 0; i--) {
        const change = changes[i];
        if (change.type !== 'insert-element') {
            continue;
        }
        // merge inserts and deletions
        const element = getNodeFromPointer(document, change.pointer);
        if (element?.type !== 'XMLElement') {
            continue;
        }
        const index = change.index ?? element.subElements.length - 1;
        const pointer = `${change.pointer}/subElements/${index}`;
        const deletionChangeIndex = changes.findIndex((c) => c.pointer === pointer && c.type === 'delete-element');

        if (deletionChangeIndex !== -1 && !replacements.has(deletionChangeIndex)) {
            replacements.set(deletionChangeIndex, {
                type: 'replace-element',
                pointer,
                newElement: change.element
            });
            deletions.add(i);
        }
    }
    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        const replacement = replacements.get(i);
        if (replacement) {
            result.push(replacement);
        } else if (!deletions.has(i)) {
            result.push(change);
        }
    }
    return result;
}

function removeDuplicates(changes: XMLDocumentChange[]): XMLDocumentChange[] {
    const existingDeletions: string[] = [];
    const result: XMLDocumentChange[] = [];
    for (const change of changes) {
        if (change.type === 'delete-element') {
            if (existingDeletions.indexOf(change.pointer) === -1) {
                existingDeletions.push(change.pointer);
                result.push(change);
            }
        } else {
            result.push(change);
        }
    }
    return result;
}

function removeOverlappingDeletes(changes: XMLDocumentChange[]): XMLDocumentChange[] {
    const result: XMLDocumentChange[] = [];
    const deletions = new Set<number>();
    for (const change of changes) {
        if (change.type === 'delete-element') {
            const pointerLength = change.pointer.split('/').length;
            for (let j = 0; j < changes.length; j++) {
                const otherChange = changes[j];
                const otherPointerLength = otherChange.pointer.split('/').length;
                if (
                    (otherChange.type === 'delete-element' || otherChange.type === 'delete-attribute') &&
                    otherChange.pointer.startsWith(change.pointer) &&
                    otherChange.pointer !== change.pointer &&
                    // startsWith can match siblings because indices are converted to string and compared as strings
                    // we need to avoid .../subElements/1 matching to .../subElements/10
                    otherPointerLength !== pointerLength
                ) {
                    deletions.add(j);
                }
            }
        }
    }
    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        if (!deletions.has(i)) {
            result.push(change);
        }
    }
    return result;
}
