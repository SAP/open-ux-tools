import { relative } from 'path';
import { fileURLToPath } from 'url';

import type { TextDocument } from 'vscode-languageserver-textdocument';
import { toReferenceUri } from '@sap-ux/project-access';

import type { NoUndefinedNamespaceData, AnnotationFile, Reference } from '@sap-ux/odata-annotation-core';
import {
    TextEdit,
    printOptions as defaultPrintOptions,
    Position,
    Edm,
    Range,
    rangeContained,
    TEXT_TYPE
} from '@sap-ux/odata-annotation-core';
import type { VocabularyService } from '@sap-ux/odata-vocabularies';

import { createMetadataCollector, type CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';

import type { Annotation, Collection, Token } from '@sap-ux/cds-annotation-parser';
import {
    copyRange,
    ENUM_TYPE,
    STRING_LITERAL_TYPE,
    ReservedProperties,
    ANNOTATION_TYPE,
    COLLECTION_TYPE,
    RECORD_PROPERTY_TYPE,
    RECORD_TYPE,
    copyPosition,
    ANNOTATION_GROUP_TYPE
} from '@sap-ux/cds-annotation-parser';
import type { Target } from '@sap-ux/cds-odata-annotation-converter';
import {
    TARGET_TYPE,
    printCsdlNode,
    printPrimitiveValue,
    indent,
    print,
    printTarget
} from '@sap-ux/cds-odata-annotation-converter';

import { increaseIndent, compareByRange } from '../utils';
import { ApiError } from '../error';

import type { Comment } from './comments';
import type { AstNode, CDSDocument, ContainerNode } from './document';
import { CDS_DOCUMENT_TYPE, getChildCount, getItems } from './document';
import type { DeletionRange } from './deletion';
import { getTextEditsForDeletionRanges, getDeletionRangeForNode } from './deletion';
import { getAstNodesFromPointer } from './pointer';

import type {
    CDSDocumentChange,
    DeleteAnnotation,
    InsertAnnotation,
    DeleteEmbeddedAnnotation,
    DeleteRecordProperty,
    DeletePrimitiveValue,
    InsertEmbeddedAnnotation,
    InsertCollection,
    InsertRecord,
    InsertRecordProperty,
    InsertPrimitiveValue,
    SetFlags,
    InsertQualifier,
    ReplaceTextValue,
    ReplaceRecordProperty,
    MoveCollectionValue,
    DeleteQualifier,
    InsertReference,
    InsertTarget,
    ReplaceNode,
    UpdatePrimitiveValue,
    DeleteRecord,
    DeleteTarget,
    ConvertToCompoundAnnotation,
    ElementInserts,
    DeleteAnnotationGroup
} from './change';
import {
    INSERT_PRIMITIVE_VALUE_TYPE,
    MOVE_COLLECTION_VALUE_CHANGE_TYPE,
    DELETE_ANNOTATION_CHANGE_TYPE,
    INSERT_ANNOTATION_CHANGE_TYPE,
    INSERT_TARGET_CHANGE_TYPE,
    INSERT_RECORD_CHANGE_TYPE,
    INSERT_COLLECTION_CHANGE_TYPE,
    INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE,
    INSERT_RECORD_PROPERTY_CHANGE_TYPE,
    INSERT_QUALIFIER_CHANGE_TYPE,
    INSERT_REFERENCE_CHANGE_TYPE,
    DELETE_EMBEDDED_ANNOTATION_CHANGE_TYPE,
    DELETE_PRIMITIVE_VALUE_CHANGE_TYPE,
    DELETE_QUALIFIER_CHANGE_TYPE,
    DELETE_RECORD_CHANGE_TYPE,
    DELETE_RECORD_PROPERTY_CHANGE_TYPE,
    REPLACE_NODE_CHANGE_TYPE,
    REPLACE_RECORD_PROPERTY_CHANGE_TYPE,
    SET_FLAGS_CHANGE_TYPE,
    UPDATE_PRIMITIVE_VALUE_CHANGE_TYPE,
    REPLACE_TEXT_VALUE_CHANGE_TYPE,
    DELETE_TARGET_CHANGE_TYPE,
    CONVERT_TO_COMPOUND_ANNOTATION_CHANGE_TYPE,
    DELETE_ANNOTATION_GROUP_CHANGE_TYPE,
    DELETE_ANNOTATION_GROUP_ITEMS_CHANGE_TYPE
} from './change';
import { preprocessChanges } from './preprocessor';
import type { CompilerToken } from './cds-compiler-tokens';
import { findLastTokenBeforePosition, findFirstTokenAfterPosition } from './cds-compiler-tokens';
import { getIndentLevelFromPointer, getIndentLevelFromNode } from './indent';

const printOptions: typeof defaultPrintOptions = { ...defaultPrintOptions, useSnippetSyntax: false };

const ANNOTATION_START_PATTERN = /^@/i;

type ChangeHandlerFunction<T extends CDSDocumentChange> = (change: T, reversePath: AstNode[]) => void | Promise<void>;
type ChangeHandler = {
    [Change in CDSDocumentChange as Change['type']]: ChangeHandlerFunction<Change>;
};

/**
 *
 */
export class CDSWriter implements ChangeHandler {
    private readonly changes: CDSDocumentChange[] = [];
    private edits: TextEdit[] = [];
    private indentLevelCache: { [pointer: string]: number } = {};
    private vocabularyAliases = new Set<string>();
    private deletionRangesMapForTarget: Map<string, DeletionRange[]> = new Map();
    private uniqueInserts = new Set<string>();
    private processedChanges: CDSDocumentChange[] = [];

    /**
     *
     * @param facade - CDS compiler facade instance.
     * @param vocabularyService - Vocabulary API.
     * @param document - CDS document AST root.
     * @param comments - All comments of the document.
     * @param tokens - All tokens in the document.
     * @param textDocument - TextDocument instance.
     * @param projectRoot - Absolute path to the project root.
     * @param annotationFile - Internal representation of the annotation file.
     */
    constructor(
        private facade: CdsCompilerFacade,
        private vocabularyService: VocabularyService,
        private document: CDSDocument,
        private comments: Comment[],
        private tokens: CompilerToken[],
        private textDocument: TextDocument,
        private projectRoot: string,
        /**
         * This should be removed once it is no longer needed by deletion logic
         *
         * @deprecated
         */
        private annotationFile: AnnotationFile
    ) {
        for (const [, vocabulary] of this.vocabularyService.getVocabularies()) {
            this.vocabularyAliases.add(vocabulary.defaultAlias);
        }
    }

    /**
     * Adds change to the stack.
     *
     * @param change - New change.
     */
    public addChange(change: CDSDocumentChange): void {
        this.changes.push(change);
    }

    /**
     * Creates text edits for the changes in the stack.
     *
     * @returns - Text edits.
     */
    public async getTextEdits(): Promise<TextEdit[]> {
        this.resetState();
        this.processedChanges = preprocessChanges(this.document, this.changes);

        console.log(this.changes)

        for (const change of this.processedChanges) {
            const path = getAstNodesFromPointer(this.document, change.pointer).reverse();
            const handler = this[change.type] as unknown as ChangeHandlerFunction<CDSDocumentChange>;
            const result = handler(change, path);
            if (result instanceof Promise) {
                await result;
            }
        }
        for (const key of this.deletionRangesMapForTarget.keys()) {
            const deletionRanges = this.deletionRangesMapForTarget.get(key) ?? [];
            if (deletionRanges.length > 0) {
                const targetDeletions = getTextEditsForDeletionRanges(
                    deletionRanges,
                    this.vocabularyAliases,
                    this.tokens,
                    this.annotationFile,
                    false
                );
                this.edits.push(...targetDeletions);
            }
        }
        this.edits.sort(compareByRange);

        return this.edits;
    }

    /**
     * Building text edits is a stateful process and needs to be cleared after each {@link CDSWriter.getTextEdits} call.
     *
     */
    private resetState(): void {
        this.edits = [];
        this.processedChanges = [];
        this.indentLevelCache = {};
        this.deletionRangesMapForTarget = new Map();
        this.uniqueInserts = new Set();
    }

    private getIndentLevel(pointer: string): number {
        const cachedValue = this.indentLevelCache[pointer];
        if (cachedValue !== undefined) {
            return cachedValue;
        }
        const level = getIndentLevelFromPointer(this.document, this.tokens, pointer);
        this.indentLevelCache[pointer] = level;
        return level;
    }

    //#region Inserts

    private isFirstInsert(pointer: string, node: ContainerNode, index: number = -1): boolean {
        const childCount = getChildCount(node);
        const i = index > -1 ? Math.min(index, childCount) : childCount;
        const insertPositionKey = `${pointer}/${i}`;
        const firstInsert = !this.uniqueInserts.has(insertPositionKey);
        this.uniqueInserts.add(insertPositionKey);
        return firstInsert;
    }

    // Change Handlers

    [INSERT_TARGET_CHANGE_TYPE] = (change: InsertTarget): void => {
        if (!this.document.range) {
            return;
        }

        let prefix = '';
        const position = this.document.range.end;
        if (this.document.range.end.character > 0) {
            prefix = '\n';
            position.character = 0;
        }

        const newElements = prefix + printTarget(change.target) + '\n';
        const edits = [TextEdit.insert(position, newElements)];
        this.edits.push(...edits);
    };

    [INSERT_RECORD_CHANGE_TYPE] = (change: InsertRecord, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        const indentLevel = this.getIndentLevel(change.pointer);
        // inserting new record as value eg: annotate IncidentService.Incidents with @UI.Chart;
        if ((astNode?.type === ANNOTATION_TYPE || astNode?.type === RECORD_PROPERTY_TYPE) && astNode.range) {
            const recordText =
                ' : ' +
                indent(print(change.element, printOptions, false), {
                    level: indentLevel,
                    skipFirstLine: true
                });
            const position = astNode.range.end;
            this.edits.push(TextEdit.insert(position, recordText));
        }
        if (astNode?.type === COLLECTION_TYPE) {
            const content = getContainerContent(astNode, this.comments, this.tokens);
            this.insertIntoNodeWithContent(
                content,
                astNode,
                change,
                indentLevel,
                this.isFirstInsert(change.pointer, astNode, change.index)
            );
        }
    };

    [INSERT_COLLECTION_CHANGE_TYPE] = (change: InsertCollection, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        const indentLevel = this.getIndentLevel(change.pointer);
        const collectionText = change.element.content.length ? print(change.element) : '[]';
        const textWithPrefix = ` : ${collectionText}`;
        const position = astNode?.range?.end;
        if (position) {
            const text = indent(textWithPrefix, { level: indentLevel + 1, skipFirstLine: true });
            this.edits.push(TextEdit.insert(position, text));
        }
    };

    [INSERT_ANNOTATION_CHANGE_TYPE] = (change: InsertAnnotation, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        if (astNode?.type !== TARGET_TYPE) {
            return;
        }
        const indentLevel = this.getIndentLevel(change.pointer);
        const content = getContainerContent(astNode, this.comments, this.tokens);
        this.convertInsertNodeToTextEdits(
            content,
            astNode,
            change,
            indentLevel,
            this.isFirstInsert(change.pointer, astNode, change.index)
        );
    };

    [INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE] = (change: InsertEmbeddedAnnotation, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        const indentLevel = this.getIndentLevel(change.pointer);
        if (astNode?.type === RECORD_TYPE) {
            const content = getContainerContent(astNode, this.comments, this.tokens);
            this.insertIntoNodeWithContent(
                content,
                astNode,
                change,
                indentLevel,
                this.isFirstInsert(change.pointer, astNode, change.index)
            );
        } else if (astNode?.type === ANNOTATION_TYPE) {
            const value = astNode.value;
            let adjustedIndentLevel = indentLevel;
            if (willTargetAnnotationIncreaseIndent(this.processedChanges, change.pointer)) {
                adjustedIndentLevel++;
            }
            if (value?.type === RECORD_TYPE) {
                const content = getContainerContent(value, this.comments, this.tokens);
                // existing value is record
                this.insertIntoNodeWithContent(
                    content,
                    value,
                    change,
                    adjustedIndentLevel,
                    this.isFirstInsert(change.pointer, value, change.index)
                );
            } else if (astNode.value?.range) {
                // existing value is primitive
                const indent = ' '.repeat(adjustedIndentLevel * printOptions.tabWidth);
                const valueIndent = ' '.repeat((adjustedIndentLevel + 1) * printOptions.tabWidth);
                const annotationText = printCsdlNode(change.element, printOptions);
                const insertEdits = [
                    TextEdit.insert(astNode.value.range.start, `{\n${valueIndent}$value : `),
                    TextEdit.insert(astNode.value.range.end, `,\n${valueIndent}${annotationText}\n${indent}}`)
                ];
                const valuePointer = [change.pointer, 'value'].join('/');
                const replacementChange = this.processedChanges.find(
                    (c) => c.pointer === valuePointer && c.type === REPLACE_NODE_CHANGE_TYPE
                );
                if (!replacementChange) {
                    let line = astNode.value.range.start.line + 1;
                    const contentIndent = ' '.repeat(printOptions.tabWidth);
                    while (line <= astNode.value.range.end.line) {
                        insertEdits.push(TextEdit.insert(Position.create(line, 0), contentIndent));
                        line++;
                    }
                }

                this.edits.push(...insertEdits);
            }
        }
    };

    [INSERT_RECORD_PROPERTY_CHANGE_TYPE] = (change: InsertRecordProperty, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        const indentLevel = this.getIndentLevel(change.pointer);
        if (astNode?.type !== RECORD_TYPE) {
            return;
        }
        const content = getContainerContent(astNode, this.comments, this.tokens);
        this.convertInsertNodeToTextEdits(
            content,
            astNode,
            change,
            indentLevel,
            this.isFirstInsert(change.pointer, astNode, change.index)
        );
    };

    [INSERT_PRIMITIVE_VALUE_TYPE] = (change: InsertPrimitiveValue, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        const indentLevel = this.getIndentLevel(change.pointer);
        if (astNode?.type === COLLECTION_TYPE) {
            const content = getContainerContent(astNode, this.comments, this.tokens);
            this.convertInsertNodeToTextEdits(
                content,
                astNode,
                change,
                indentLevel,
                this.isFirstInsert(change.pointer, astNode, change.index)
            );
        } else if ((astNode?.type === RECORD_PROPERTY_TYPE || astNode?.type === ANNOTATION_TYPE) && astNode.range) {
            const textNode = change.element.content[0];
            const value = textNode?.type === TEXT_TYPE ? textNode.text : '';
            const recordText = ' : ' + indent(printPrimitiveValue(change.element.name, value));
            this.edits.push(TextEdit.insert(astNode.range.end, recordText));
        }
    };

    [INSERT_QUALIFIER_CHANGE_TYPE] = (change: InsertQualifier, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        if (astNode?.type === ANNOTATION_TYPE && astNode.term.range) {
            this.edits.push(TextEdit.insert(astNode.term.range.end, ` #${change.value}`));
        }
    };

    [INSERT_REFERENCE_CHANGE_TYPE] = async (change: InsertReference): Promise<void> => {
        const { position, prependNewLine } = getInsertReferencePosition(this.document.references);
        // TODO: this breaks memfs concept
        const text = `${prependNewLine ? '\n' : ''}${await getTextEditForMissingRefs(
            change.references,
            this.document.uri,
            this.projectRoot
        )}`;
        this.edits.push(TextEdit.insert(position, text));
    };

    //#endregion

    //#region Deletes

    private deleteNode(pointer: string, reversePath: AstNode[]): void {
        const [astNode, parent] = reversePath;
        const segments = pointer.split('/');
        const lastIndex = segments.pop();
        deleteValue(this.edits, pointer, astNode, parent, this.comments, this.tokens, lastIndex);
    }

    [DELETE_TARGET_CHANGE_TYPE] = (_change: DeleteTarget, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        if (astNode?.type !== TARGET_TYPE || !astNode.range || !astNode.nameRange) {
            return;
        }

        // TODO: check if we can relay on target.kind instead of going through edmx conversions
        const { edmxPath } = this.facade.collectMetadataForAbsolutePath(
            astNode.name,
            astNode.kind,
            createMetadataCollector(new Map(), this.facade)
        );

        const ranges = astNode.assignments
            .flatMap((assignment) => (assignment.type === ANNOTATION_TYPE ? [assignment] : assignment.items.items))
            .map((annotation, i) => {
                return getDeletionRangeForNode(
                    this.vocabularyService,
                    this.vocabularyAliases,
                    i,
                    this.tokens,
                    annotation,
                    edmxPath
                );
            })
            .filter((range): range is DeletionRange => !!range);

        const targetDeletions = getTextEditsForDeletionRanges(
            ranges,
            this.vocabularyAliases,
            this.tokens,
            this.annotationFile,
            true
        );
        if (targetDeletions) {
            this.edits.push(...targetDeletions);
        }
    };

    [DELETE_RECORD_CHANGE_TYPE] = (change: DeleteRecord, reversePath: AstNode[]): void => {
        this.deleteNode(change.pointer, reversePath);
    };

    [DELETE_RECORD_PROPERTY_CHANGE_TYPE] = (change: DeleteRecordProperty, reversePath: AstNode[]): void => {
        this.deleteNode(change.pointer, reversePath);
    };

    [DELETE_ANNOTATION_GROUP_CHANGE_TYPE] = (change: DeleteAnnotationGroup, reversePath: AstNode[]): void => {
        const [astNode, parent] = reversePath;
        const segments = change.pointer.split('/');
        const lastIndex = segments.pop() ?? '';
        const index = parseInt(lastIndex, 10);
        if (Number.isNaN(index) || astNode?.type !== ANNOTATION_GROUP_TYPE || parent?.type !== TARGET_TYPE) {
            return;
        }
        const content = getContainerContent(parent, this.comments, this.tokens);
        const { startContentIndex } = findContentIndices(content, index, index);
        deleteBlock(this.edits, content, startContentIndex);
    };

    [DELETE_ANNOTATION_GROUP_ITEMS_CHANGE_TYPE] = (): void => {
        // should never be called
        // preprocessor converts these changes to DeleteAnnotationGroup
    };

    private getDeletionRange(annotation: Annotation, target: Target, index: number): DeletionRange | undefined {
        const { edmxPath } = this.facade.collectMetadataForAbsolutePath(
            target.name,
            target.kind,
            createMetadataCollector(new Map(), this.facade)
        );
        return getDeletionRangeForNode(
            this.vocabularyService,
            this.vocabularyAliases,
            index,
            this.tokens,
            annotation,
            edmxPath
        );
    }

    [DELETE_ANNOTATION_CHANGE_TYPE] = (change: DeleteAnnotation, reversePath: AstNode[]): void => {
        const [annotation, parent, , greatGrandParent] = reversePath;
        const segments = change.pointer.split('/');
        const lastIndex = segments.pop();
        const isInAnnotationGroup = greatGrandParent?.type === TARGET_TYPE;
        const target = isInAnnotationGroup ? greatGrandParent : parent;
        if (!lastIndex || annotation?.type !== ANNOTATION_TYPE || target.type !== TARGET_TYPE) {
            return;
        }
        const targetPointer = change.pointer.split('/').slice(0, 3).join('/');

        const assignmentIndex = parseInt(lastIndex, 10);
        if (Number.isNaN(assignmentIndex)) {
            return;
        }
        let index = 0;

        // We need to calculate correct indices for the annotations
        for (let i = 0; i < target.assignments.length; i++) {
            const assignment = target.assignments[i];
            if (assignment.type === ANNOTATION_GROUP_TYPE) {
                index += assignment.items.items.length;
            } else {
                if (i === assignmentIndex) {
                    break;
                }
                index++;
            }
        }

        const range = this.getDeletionRange(annotation, target, index);

        if (!range) {
            return;
        }

        let targetDeletionRanges = this.deletionRangesMapForTarget.get(targetPointer);

        if (!targetDeletionRanges) {
            targetDeletionRanges = [];
            this.deletionRangesMapForTarget.set(targetPointer, targetDeletionRanges);
        }

        targetDeletionRanges.push(range);
    };

    [DELETE_EMBEDDED_ANNOTATION_CHANGE_TYPE] = (change: DeleteEmbeddedAnnotation, reversePath: AstNode[]): void => {
        const [astNode, parent] = reversePath;
        if (astNode?.type === ANNOTATION_TYPE && parent.type === RECORD_TYPE) {
            // Transform $value back to normal primitive value representation if last embedded annotation is being deleted
            const firstProperty = parent.properties[0];
            const isTransformPossible =
                parent.annotations?.length === 1 &&
                parent.properties.length === 1 &&
                firstProperty.name.value === ReservedProperties.Value;
            if (isTransformPossible && parent.range && firstProperty.value?.range) {
                // delete surrounding record parts, leaving property value only
                this.edits.push(
                    TextEdit.del(Range.create(parent.range.start, firstProperty.value.range.start)),
                    TextEdit.del(Range.create(firstProperty.value.range.end, parent.range.end))
                );
            } else {
                this.deleteNode(change.pointer, reversePath);
            }
        }
    };
    [DELETE_PRIMITIVE_VALUE_CHANGE_TYPE] = (change: DeletePrimitiveValue, reversePath: AstNode[]): void => {
        this.deleteNode(change.pointer, reversePath);
    };

    [DELETE_QUALIFIER_CHANGE_TYPE] = (change: DeleteQualifier, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        if (!astNode?.range) {
            return;
        }
        const range: Range = copyRange(astNode.range);
        range.start.character--; // also include # character
        this.edits.push(TextEdit.del(range));
    };

    //#endregion

    //#region Modifications

    [REPLACE_NODE_CHANGE_TYPE] = (change: ReplaceNode, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        if (!astNode?.range) {
            return;
        }
        let indentLevel = this.getIndentLevel(change.pointer);
        const parentPointer = change.pointer.split('/').slice(0, -1).join('/');
        const insertEmbeddedAnnotationChange = this.changes.find(
            (change) => change.pointer === parentPointer && change.type === INSERT_EMBEDDED_ANNOTATION_CHANGE_TYPE
        );

        if (willTargetAnnotationIncreaseIndent(this.processedChanges, change.pointer)) {
            indentLevel++;
        }
        if (insertEmbeddedAnnotationChange) {
            indentLevel++;
        }

        const fragment = print(change.newElement, printOptions);
        const indentedFragment = increaseIndent(fragment, indentLevel, true);
        this.edits.push(TextEdit.replace(astNode.range, indentedFragment));
    };
    [REPLACE_RECORD_PROPERTY_CHANGE_TYPE] = (change: ReplaceRecordProperty, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        const indentLevel = this.getIndentLevel(change.pointer);

        if (!astNode?.range) {
            return;
        }

        const text = indent(print(change.newProperty, printOptions, false), {
            level: indentLevel + 1,
            skipFirstLine: true
        });

        this.edits.push(TextEdit.replace(astNode.range, text));
    };
    [REPLACE_TEXT_VALUE_CHANGE_TYPE] = (change: ReplaceTextValue, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        if (!astNode?.range) {
            return;
        }
        let expressionType: string | undefined = '';
        if (astNode?.type) {
            expressionType = convertCDSAstToEdmType(astNode.type);
        }
        if (expressionType === undefined) {
            console.warn(
                `Could not determine expression type for ${JSON.stringify(
                    change,
                    undefined,
                    2
                )}. For changing enum flags "set-flags" change should be used.`
            );
            return;
        }

        this.edits.push(TextEdit.replace(astNode.range, printPrimitiveValue(expressionType, change.newValue)));
    };
    [UPDATE_PRIMITIVE_VALUE_CHANGE_TYPE] = (change: UpdatePrimitiveValue, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;

        if (!astNode?.range) {
            return;
        }

        if (astNode.type === STRING_LITERAL_TYPE) {
            const range = copyRange(astNode.range);
            // string range includes quotes, but we only need to replace content.
            range.start.character++;
            range.end.character--;
            this.edits.push(TextEdit.replace(range, change.newValue));
        } else if (astNode.type === ENUM_TYPE && astNode.path.range) {
            this.edits.push(TextEdit.replace(astNode.range, printPrimitiveValue(Edm.EnumMember, change.newValue)));
        } else {
            this.edits.push(TextEdit.replace(astNode.range, change.newValue));
        }
    };
    //#endregion
    [SET_FLAGS_CHANGE_TYPE] = (change: SetFlags, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        if (astNode?.type === COLLECTION_TYPE && astNode.range) {
            this.edits.push(TextEdit.replace(astNode.range, printPrimitiveValue(Edm.EnumMember, change.value)));
        } else if (astNode?.type === ENUM_TYPE) {
            console.warn(
                `Could not apply change "set-flags". Expected target to be '${COLLECTION_TYPE}, but got ${ENUM_TYPE}. To replace single enum value 'replace-text-value' change should be used`
            );
        }
    };
    [MOVE_COLLECTION_VALUE_CHANGE_TYPE] = (change: MoveCollectionValue, reversePath: AstNode[]): void => {
        const [astNode] = reversePath;
        if (astNode.type !== COLLECTION_TYPE) {
            return;
        }
        const content = getContainerContent(astNode, this.comments, this.tokens);
        const anchor = this.findInsertPosition(content, astNode, change.pointer, change.index);
        const indentLevel = this.getIndentLevel(change.pointer);
        if (anchor) {
            if (anchor.commaPosition) {
                this.edits.push(TextEdit.insert(anchor.commaPosition, ','));
            }
            const ranges = createElementRanges(this.document, this.tokens, change.fromPointers);
            const moveEdits = getTextEditsForMove(
                this.textDocument,
                this.comments,
                this.tokens,
                anchor.position,
                ranges,
                indentLevel
            );
            this.edits.push(...moveEdits);
            if (
                astNode.closeToken?.range &&
                astNode.closeToken?.range?.end?.line === astNode.openToken?.range?.end?.line
            ) {
                // [] is on the same line -> we need to expand this to multiple lines
                const indent = '    '.repeat(indentLevel);
                this.edits.push(TextEdit.insert(astNode.closeToken.range.start, '\n' + indent));
            }
        }
    };
    [CONVERT_TO_COMPOUND_ANNOTATION_CHANGE_TYPE] = (
        change: ConvertToCompoundAnnotation,
        reversePath: AstNode[]
    ): void => {
        const [astNode] = reversePath;
        if (astNode?.type !== TARGET_TYPE) {
            return;
        }
        const indentLevel = this.getIndentLevel(change.pointer);
        const conversionSteps = convertToCompoundAnnotation(
            this.tokens,
            astNode,
            indentLevel,
            change.applyContentIndentation
        );
        if (conversionSteps.length) {
            this.edits.push(...conversionSteps);
        }
    };

    private insertIntoNodeWithContent<T extends ElementInserts>(
        content: ContainerContentBlock[],
        parent: ContainerNode,
        change: T,
        indentLevel: number,
        firstInsert: boolean
    ): void {
        const index = getIndexForInsertion(getChildCount(parent), change.index);
        // change.index should not be used in this scope, because changes with indices outside the container size are merged
        // and change.index would not correctly reflect the place where a change needs to be inserted
        if (!change || !parent.range) {
            return;
        }
        const newElements = printChange(parent)(change);
        if (getChildCount(parent) === 0) {
            const fragments: string[] = [];
            const range = copyRange(parent.range);
            // we need to adjust range to exclude boundary characters
            range.start.character++; // range includes '{' or '[' characters
            range.end.character--; // range includes '}' or ']' characters

            fragments.push('\n');
            fragments.push(newElements);
            fragments.push(',');
            const text = indent(deIndent(fragments.join('')), {
                level: indentLevel + 1,
                skipFirstLine: true
            });
            this.insertText(range, text, indentLevel, firstInsert);
        } else {
            const anchor = this.findInsertPosition(content, parent, change.pointer, index ?? -1);
            if (!anchor) {
                return;
            }
            const fragments: string[] = [];

            if (firstInsert && anchor.commaPosition) {
                // for repeated inserts at the same spot we'll already have the trailing comma
                this.edits.push(TextEdit.insert(anchor.commaPosition, ','));
            }

            fragments.push('\n');
            fragments.push(newElements);
            fragments.push(',');
            let finalText = fragments.join('');
            finalText = deIndent(finalText);
            const text = indent(finalText, {
                level: indentLevel + 1,
                skipFirstLine: true
            });
            this.edits.push(TextEdit.insert(anchor.position, text));
        }
    }

    private insertText(range: Range, text: string, indentLevel: number, firstInsert: boolean): void {
        if (firstInsert) {
            this.edits.push(TextEdit.replace(range, text + indent('\n', { level: indentLevel, skipFirstLine: true })));
        } else {
            // Multiple inserts will have the same replacement range, we need to group them because
            // only one text edit with that replacement range can be applied.
            const edit = this.edits.find((edit) => isRangesEqual(edit.range, range));
            if (edit) {
                const lines = edit.newText.split('\n');
                lines[lines.length - 2] += text;
                edit.newText = lines.join('\n');
            }
        }
    }

    private convertInsertNodeToTextEdits<T extends ElementInserts>(
        content: ContainerContentBlock[],
        parent: ContainerNode | CDSDocument,
        change: T,
        childIndentLevel: number,
        firstInsert: boolean
    ): void {
        if (!change) {
            return;
        }
        if (parent.type !== CDS_DOCUMENT_TYPE) {
            this.insertIntoNodeWithContent(content, parent, change, childIndentLevel, firstInsert);
        }
    }

    private findInsertPosition(
        content: ContainerContentBlock[],
        parent: ContainerNode,
        insertionPointer: string,
        index = -1
    ): { position: Position; commaPosition?: Position } | undefined {
        const childCount = getChildCount(parent);
        if (childCount === 0) {
            if (!parent.range) {
                return undefined;
            }
            const position = copyPosition(parent.range.start);
            position.character++; // range includes '{' or '[' characters
            return { position };
        }
        const i = index > -1 ? Math.min(index, childCount) : childCount;
        const { previousContentIndex, startContentIndex } = findContentIndices(content, i);
        const anchor = getStartAnchor(content, parent, previousContentIndex, startContentIndex);
        const previousElement = content[previousContentIndex];
        if (anchor) {
            if (
                previousElement?.type === 'element' &&
                !previousElement.trailingComma &&
                previousElement.element.range
            ) {
                if (!skipCommaInsertion(this.changes, content, this.document, previousContentIndex)) {
                    return {
                        position: anchor,
                        commaPosition: copyPosition(previousElement.element.range.end)
                    };
                }
            }
            return { position: anchor };
        }
        return undefined;
    }
}

function willTargetAnnotationIncreaseIndent(changes: CDSDocumentChange[], pointer: string): boolean {
    const targetPointer = pointer.split('/').slice(0, 3).join('/');
    const conversionChange = changes.find(
        (change) => change.pointer === targetPointer && change.type === CONVERT_TO_COMPOUND_ANNOTATION_CHANGE_TYPE
    );

    return !!conversionChange;
}

function convertToCompoundAnnotation(
    tokens: CompilerToken[],
    node: Target,
    indentLevel: number,
    indentContent: boolean
): TextEdit[] {
    if (!node.range) {
        return [];
    }

    // All assignments are grouped to the same target, but we only need to replace the last one.
    const startPosition = node.assignments[node.assignments.length - 1]?.range?.start ?? node.range?.start;
    const startToken = findLastTokenBeforePosition(ANNOTATION_START_PATTERN, tokens, startPosition);
    if (!startToken) {
        return [];
    }
    const nextToken = tokens[startToken.tokenIndex + 1];
    if (!nextToken || nextToken.text === '(') {
        return [];
    }

    // there can be trailing comma before the closing token ')' or ';'
    const afterEndToken = findFirstTokenAfterPosition(/[^,]/, tokens, node.range?.end);
    // there should always be an afterEndToken
    // if it is an annotation on element then it would at least end with '}'
    // if it is an annotation on entity then it would be ';'
    if (!afterEndToken || afterEndToken.text === ')') {
        // either its a compound annotation or there is something else wrong and we should create text edits
        return [];
    }
    const endToken = findLastTokenBeforePosition(undefined, tokens, node.range?.end);
    if (!endToken) {
        return [];
    }
    const indentText = '    '.repeat(indentLevel + 1);
    const closingIndent = '    '.repeat(indentLevel);
    const contentIndent: TextEdit[] = [];
    if (indentContent) {
        for (let index = startToken.line; index < endToken.line; index++) {
            contentIndent.push(TextEdit.insert(Position.create(index, 0), '    '));
        }
    }

    // if annotation ends with ';' we need to insert closing ')' before ';' otherwise we need to insert it after the last token
    // sometimes element annotations many end without ';'
    const endCharacter = afterEndToken.text === ';' ? afterEndToken.column : endToken.column + endToken.text.length;
    return [
        TextEdit.insert(Position.create(startToken.line - 1, startToken.column + 1), `(\n${indentText}`),
        ...contentIndent,
        TextEdit.insert(Position.create(endToken.line - 1, endCharacter), `\n${closingIndent})`)
    ];
}

function deleteBlock(edits: TextEdit[], content: ContainerContentBlock[], blockIndex: number): void {
    const block = content[blockIndex];
    if (block?.type !== 'element') {
        return;
    }
    edits.push(TextEdit.del(block.range));
    const previous = content[blockIndex - 1];
    const next = content[blockIndex + 1];
    if (next?.range) {
        // there could be whitespace to the next element which should be removed
        edits.push(TextEdit.del(Range.create(block.range.end, next.range.start)));
    } else if (previous?.range) {
        // if the last child element is being deleted then white space between the last and previous should be removed as well
        deletePreviousElementWhiteSpaces(previous, block, edits);
        // iterate over the previous of previous element, if the previous element is already deleted.ß
        enhanceDeletionRange(edits, content, blockIndex);
    }
}

function enhanceDeletionRange(edits: TextEdit[], content: ContainerContentBlock[], blockIndex: number) {
    for (let i = blockIndex - 1; i > -1; i--) {
        const prev = content[i];
        if (edits.some((item) => isRangesEqual(item.range, prev.range))) {
            // previous element is being deleted
            // the space above it should be included in deletion scope
            const beforePrev = content[i - 1];
            if (beforePrev?.range) {
                deletePreviousElementWhiteSpaces(beforePrev, prev, edits);
            } else {
                break;
            }
        } else {
            break;
        }
    }
}

function deletePreviousElementWhiteSpaces(
    previousElement: ContainerContentBlock,
    currentBlock: ContainerContentBlock,
    edits: TextEdit[]
): void {
    const edit = TextEdit.del(Range.create(previousElement.range!.end, currentBlock.range!.start));
    // other deletion edits with the same range may already exist
    if (!edits.some((item) => isRangesEqual(item.range, edit.range))) {
        edits.push(edit);
    }
}

function deleteValue(
    edits: TextEdit[],
    pointer: string,
    astNode: AstNode,
    parent: AstNode,
    comments: Comment[],
    tokens: CompilerToken[],
    lastIndex?: string
): void {
    if (parent.type === COLLECTION_TYPE) {
        if (!lastIndex) {
            throw new ApiError(`${pointer} is not pointing to a collection element.`);
        }
        const content = getContainerContent(parent, comments, tokens);
        const index = parseInt(lastIndex, 10);
        const { startContentIndex } = findContentIndices(content, index);
        deleteBlock(edits, content, startContentIndex);
    } else if (
        parent.type === RECORD_TYPE &&
        (astNode.type === RECORD_PROPERTY_TYPE || astNode.type === ANNOTATION_TYPE)
    ) {
        if (!lastIndex) {
            throw new ApiError(`${pointer} is not pointing to a record property.`);
        }
        const content = getContainerContent(parent, comments, tokens);
        const index = parseInt(lastIndex, 10);
        const { startContentIndex } = findContentIndices(content, index, index, astNode.type);
        deleteBlock(edits, content, startContentIndex);
    } else if (parent.type === ANNOTATION_TYPE || parent.type === RECORD_PROPERTY_TYPE) {
        // delete record value including ':'
        if (parent.colon?.range && astNode.range) {
            const range = Range.create(parent.colon.range.start, astNode.range.end);
            edits.push(TextEdit.del(range));
        }
    } else {
        throw new ApiError(`Invalid ${pointer} for 'delete-record' change.`);
    }
}

function printChange(parent: ContainerNode | undefined) {
    return function (change: ElementInserts) {
        if (change.type === INSERT_PRIMITIVE_VALUE_TYPE) {
            const text = change.element.content[0]?.type === TEXT_TYPE ? change.element.content[0].text : '';
            return printPrimitiveValue(change.element.name, text);
        } else if (parent?.type === RECORD_TYPE && change.element.name === Edm.Annotation) {
            return printCsdlNode(change.element, printOptions);
        } else {
            return print(change.element, printOptions);
        }
    };
}

function getIndexForInsertion(containerSize: number, insertionIndex?: number): number {
    return insertionIndex !== undefined && insertionIndex > -1
        ? Math.min(insertionIndex, containerSize)
        : containerSize;
}

function getCommas(container: ContainerNode, tokens: CompilerToken[]): Token[] {
    if (container.type === TARGET_TYPE) {
        if (!container.range) {
            return [];
        }
        return extractCommasFromCompilerTokens(container.range, container.assignments, tokens);
    } else {
        return container.commas;
    }
}

function extractCommasFromCompilerTokens<T extends { range?: Range }>(
    range: Range,
    items: T[],
    tokens: CompilerToken[]
): Token[] {
    const result: Token[] = [];
    const { start, end } = range;
    const startTokenIndex = tokens.findIndex(
        (token) => token.line === start.line + 1 && token.column === start.character
    );
    for (let i = startTokenIndex; i < tokens.length; i++) {
        const token = tokens[i];
        const tokenRange = Range.create(token.line - 1, token.column, token.line - 1, token.column + token.text.length);
        if (token.text === ',' && !items.some((item) => item.range && rangeContained(item.range, tokenRange))) {
            // we are only interested in commas separating items -> ignore commas that are inside an item
            result.push({
                type: 'token',
                value: ',',
                range: tokenRange
            });
        }
        if ((token.line === end.line + 1 && token.column >= end.character) || token.line > end.line + 1) {
            break;
        }
    }
    return result;
}

function getStartAnchor(
    content: ContainerContentBlock[],
    parent: ContainerNode,
    previous: number,
    index: number
): Position | undefined {
    const previousElement = content[previous];

    let startPosition = index === 0 ? parent.range?.start : previousElement?.range?.end;

    const element = content[index];
    if (startPosition) {
        startPosition = copyPosition(startPosition);

        if (index === 0) {
            startPosition.character++;
        }
    }
    if (!startPosition) {
        return undefined;
    }
    if (!element && previousElement?.type === 'element') {
        return startPosition;
    }
    const previousItem = content[index - 1];
    if (previousItem?.type === 'comment') {
        // multiple comments between previous item and starting item -> ignore them
        updatePosition(startPosition, previousItem.range.end);
    }
    return startPosition;
}

function serializeReference(data: NoUndefinedNamespaceData): string {
    if (data.namespace) {
        if (data.alias) {
            return `using ${data.namespace} as ${data.alias} from '${data.referenceUri}';`;
        } else {
            return `using ${data.namespace} from '${data.referenceUri}';`;
        }
    } else {
        return `using from '${data.referenceUri}';`;
    }
}

async function getTextEditForMissingRefs(
    missingReferences: string[],
    fileUri: string,
    projectRoot: string
): Promise<string> {
    const missingReferencesTexts: string[] = [];
    for (const missingRef of missingReferences) {
        const relativePath = relative(projectRoot, fileURLToPath(fileUri));
        const referenceUri = await toReferenceUri(projectRoot, relativePath, missingRef);
        missingReferencesTexts.push(serializeReference({ namespace: '', referenceUri }));
    }
    return missingReferencesTexts.join('\n') + '\n';
}

function isRangesEqual(range1: Range | undefined, range2: Range | undefined): boolean {
    if (!range1 || !range2) {
        return false;
    }

    return (
        range1.start.line === range2.start.line &&
        range1.start.character === range2.start.character &&
        range1.end.line === range2.end.line &&
        range1.end.character === range2.end.character
    );
}

function convertCDSAstToEdmType(kind: string): Edm | undefined {
    switch (kind) {
        case 'time':
            return Edm.TimeOfDay;
        case 'date':
            return Edm.Date;
        case 'timestamp':
            return Edm.DateTimeOffset;
        case 'binary':
            return Edm.Binary;
        case 'path':
            return Edm.Path;
        case 'boolean':
            return Edm.Bool;
        case 'string':
            return Edm.String;
        case 'enum':
            return Edm.EnumMember;
        case 'number':
            return Edm.Decimal;
        default:
            return undefined;
    }
}

function deIndent(text: string): string {
    return text
        .split('\n')
        .map((val) => val.trimStart())
        .join('\n');
}

function getInsertReferencePosition(references: Reference[]): { position: Position; prependNewLine: boolean } {
    const range = references[references.length - 1]?.uriRange;
    if (!range) {
        return { position: Position.create(0, 0), prependNewLine: false };
    }
    const position = copyPosition(range.end);
    // reference last position includes its last character, we need to insert after it.
    position.character++;
    return { position, prependNewLine: true };
}

interface CutRange {
    parent: Collection;
    indentLevel: number;
    start: number;
    end: number;
}

function createElementRanges(document: CDSDocument, tokens: CompilerToken[], pointers: string[]): CutRange[] {
    const ranges: CutRange[] = [];
    const groups = pointers.reduce((acc, pointer) => {
        const segments = pointer.split('/');
        // remove /items/<index> suffix
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
        const [parent] = getAstNodesFromPointer(document, containerPath).reverse();
        if (parent?.type === COLLECTION_TYPE) {
            const indentLevel = getIndentLevelFromNode(tokens, parent);
            indices.sort((index1, index2) => index1 - index2);
            for (let i = 1, start = indices[0], end = indices[0]; i <= indices.length; i++) {
                const current = indices[i];
                if (current === undefined) {
                    // end of collection
                    ranges.push({ parent, start, end, indentLevel });
                } else if (end + 1 === current) {
                    // indices are in sequence -> merge
                    end = current;
                } else {
                    // there is a gap between indices -> create a range
                    ranges.push({ parent, start, end, indentLevel });
                    start = end = current;
                }
            }
        }
    }
    return ranges;
}

function getTextEditsForMove(
    document: TextDocument,
    comments: Comment[],
    tokens: CompilerToken[],
    position: Position,
    ranges: ReturnType<typeof createElementRanges>,
    indentLevel: number
): TextEdit[] {
    const edits: TextEdit[] = [];
    const text: string[] = [];
    for (const range of ranges) {
        const sourceContent = getContainerContent(range.parent, comments, tokens);
        cutRange(document, sourceContent, range, indentLevel, text, edits);
    }
    edits.push(TextEdit.insert(position, ''.concat(...text)));
    return edits;
}

function findContentIndices(
    content: ContainerContentBlock[],
    start: number,
    end: number = start,
    nodeType?: typeof ANNOTATION_TYPE | typeof RECORD_PROPERTY_TYPE | typeof ANNOTATION_GROUP_TYPE
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
        if (element.type === 'element' && (!nodeType || element.element.type === nodeType)) {
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

function isComma(token: AstNode | Comment | ContainerContentBlock | undefined): token is Token {
    return token?.type === 'token' && token.value === ',';
}

function cutRange(
    textDocument: TextDocument,
    content: ContainerContentBlock[],
    cutRange: CutRange,
    indentLevel: number,
    text: string[],
    edits: TextEdit[]
): void {
    const { parent, start, end } = cutRange;

    const { previousContentIndex, endContentIndex } = findContentIndices(content, start, end);
    const previousElement = content[previousContentIndex];
    const endElement = content[endContentIndex];
    let startPosition = start === 0 ? parent.openToken?.range?.end : previousElement?.range?.end;
    let endPosition = endElement?.range?.end;
    if (startPosition) {
        startPosition = copyPosition(startPosition);
    }
    if (endPosition) {
        endPosition = copyPosition(endPosition);
    }
    if (!startPosition || !endPosition) {
        return;
    }
    let suffix: string | undefined;

    if (endElement?.type === 'element') {
        if (!endElement.trailingComma && endElement.trailingComment && endElement.element.range) {
            // ...} // some comment
            // ___|_______________|
            //  |        |
            // cut    suffix  range
            const range = copyRange(Range.create(endElement.element.range.end, endElement.trailingComment.range.end));
            edits.push(TextEdit.del(range));
            suffix = ',' + textDocument.getText(range);
            updatePosition(endPosition, endElement.element.range.end);
        } else if (!endElement.trailingComma) {
            // ...}
            suffix = ',';
        }
    }

    const range = copyRange(Range.create(startPosition, endPosition));
    const originalText = textDocument.getText(range);
    text.push(makeCut(originalText, suffix, cutRange, indentLevel));
    edits.push(TextEdit.del(range));
}

function makeCut(originalText: string, suffix: string | undefined, cutRange: CutRange, indentLevel: number): string {
    let cut = originalText;
    const difference = indentLevel - cutRange.indentLevel;
    if (difference > 0) {
        const indent = '    '.repeat(difference);
        cut = cut.replaceAll('\n', '\n' + indent);
    } else if (difference < 0) {
        const indent = '    '.repeat(difference * -1);
        cut = cut.replaceAll('\n' + indent, '\n');
    }
    if (suffix !== undefined) {
        return cut + suffix;
    } else {
        return cut;
    }
}

function updatePosition(a: Position, b: Position): void {
    a.line = b.line;
    a.character = b.character;
}

type ContainerContentBlock = ElementWithComments | Comment | Token;

interface ElementWithComments {
    type: 'element';
    leadingComment?: Comment;
    trailingComment?: Comment;
    trailingComma?: Token;
    element: AstNode;
    elementRange: Range;
    range: Range;
}

function getContainerContent(
    collection: ContainerNode,
    comments: Comment[],
    tokens: CompilerToken[]
): ContainerContentBlock[] {
    if (!collection.range) {
        return [];
    }
    const items = getItems(collection);
    const commas = getCommas(collection, tokens);
    const commentsInContent = (
        collection.range !== undefined
            ? comments.filter((comment) => rangeContained(collection.range!, comment.range))
            : []
    ).filter((comment) => !items.some((item) => item.range && rangeContained(item.range, comment.range)));
    const source = [...commas, ...items, ...commentsInContent].sort(compareByRange);
    const content: ContainerContentBlock[] = [];
    for (const node of source) {
        processNode(content, node);
    }
    return content;
}

function processNode(content: ContainerContentBlock[], item: Comment | AstNode): void {
    const previousItem = content[content.length - 1];

    if (!item.range) {
        return;
    }
    if (isComma(item)) {
        if (previousItem?.type === 'element') {
            previousItem.trailingComma = item;
            updatePosition(previousItem.range.end, item.range.end);
        } else {
            content.push(item);
        }
    } else if (item.type === 'comment') {
        if (previousItem?.type === 'element' && item.range.start.line === previousItem.range.end.line) {
            previousItem.trailingComment = item;
            updatePosition(previousItem.range.end, item.range.end);
        } else {
            content.push(item);
        }
    } else {
        const element: ElementWithComments = {
            type: 'element',
            element: item,
            elementRange: copyRange(item.range),
            range: copyRange(item.range)
        };
        const previousLine = element.range.start.line - 1;
        if (
            previousItem?.type === 'comment' &&
            (previousItem.range.end.line === previousLine || previousItem.range.end.line === element.range.start.line)
        ) {
            // typescript can't infer that content.pop() === previousItem
            element.leadingComment = content.pop() as Comment;
            updatePosition(element.range.start, previousItem.range.start);
        }
        content.push(element);
    }
}
function skipCommaInsertion(
    changes: CDSDocumentChange[],
    content: ContainerContentBlock[],
    document: CDSDocument,
    insertAfterIndex: number
) {
    return !!changes.find((change) => {
        if (!change.type.startsWith('delete')) {
            return false;
        }
        const astNodes = getAstNodesFromPointer(document, change.pointer);
        const toBeDeletedNodes = astNodes[astNodes.length - 1];
        const node = content[insertAfterIndex];
        if (node.type === 'element' && node?.element === toBeDeletedNodes) {
            if (toBeDeletedNodes.type === 'annotation' && content.length === 1) {
                return false;
            }
            return true;
        } else {
            return false;
        }
    });
}
