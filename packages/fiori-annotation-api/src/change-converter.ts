import type { AliasInformation, AnnotationFile, Element, ElementChild } from '@sap-ux/odata-annotation-core-types';
import {
    ELEMENT_TYPE,
    ATTRIBUTE_TYPE,
    createElementNode,
    createTextNode,
    Edm,
    createTarget,
    TEXT_TYPE,
    ANNOTATION_FILE_TYPE
} from '@sap-ux/odata-annotation-core-types';

import {
    getAliasInformation,
    getAllNamespacesAndReferences,
    toAliasQualifiedName
} from '@sap-ux/odata-annotation-core';
import type { AnnotationRecord, Expression, RawMetadata } from '@sap-ux/vocabularies-types';
import type { VocabularyService } from '@sap-ux/odata-vocabularies';
import type { MetadataService } from '@sap-ux/odata-entity-model';

import type { AVTNode } from './avt';
import {
    convertAnnotationToInternal,
    convertPointerInAnnotationToInternal,
    convertExpressionToInternal,
    convertPrimitiveValueToInternal,
    findAnnotationByReference,
    getAvtNodeFromPointer,
    convertCollectionToInternal,
    convertPropertyValueToInternal,
    convertRecordToInternal,
    findAnnotation
} from './avt';

import { addAllVocabulariesToAliasInformation } from './vocabularies';

import type {
    AnnotationFileChange,
    InsertTarget,
    Change,
    InsertElement,
    JsonPointer,
    DeleteElement,
    DeleteAttribute,
    UpdateAttributeValue,
    ReplaceElement,
    ReplaceElementContent,
    ReplaceAttribute,
    MoveElements,
    ReplaceText,
    InsertAnnotationChange,
    CompiledService,
    AnnotationReference,
    InsertAttribute,
    InsertChange,
    UpdateChange,
    InsertEmbeddedAnnotationChange,
    DeleteChange,
    MoveChange,
    ExpressionUpdateContent,
    ExpressionModificationContent,
    PrimitiveModificationContent,
    UpdateContent
} from './types';
import {
    ChangeType,
    DELETE_ATTRIBUTE,
    DELETE_ELEMENT,
    ExpressionType,
    INSERT_ATTRIBUTE,
    INSERT_ELEMENT,
    INSERT_TARGET,
    UPDATE_ATTRIBUTE_VALUE,
    MOVE_ELEMENT,
    REPLACE_ATTRIBUTE,
    REPLACE_ELEMENT,
    REPLACE_ELEMENT_CONTENT,
    REPLACE_TEXT
} from './types';
import { annotationReferenceToString, getGenericNodeFromPointer } from './utils';
import { ApiError, ApiErrorCode } from './error';

export type SchemaProvider = () => RawMetadata;
/**
 * Converts changes to the internal change format.
 */
export class ChangeConverter {
    private aliasInfoCache: Record<string, AliasInformation> = {};
    private newTargetChanges: Map<string, Map<string, InsertAnnotationChange[]>> = new Map();
    private annotationFileChanges: AnnotationFileChange[] = [];
    /**
     *
     * @param serviceName Name of the service.
     * @param vocabularyAPI Vocabulary API instance.
     * @param metadataService Metadata service.
     * @param splitAnnotationSupport Flag indicating if partial annotation definitions are supported.
     * @param ignoreChangedFileInitialContent Flag indicating if to be changed files can be treated as empty.
     */
    constructor(
        private serviceName: string,
        private vocabularyAPI: VocabularyService,
        private metadataService: MetadataService,
        private splitAnnotationSupport: boolean,
        private ignoreChangedFileInitialContent: boolean
    ) {}
    /**
     * Converts changes to the internal change format.
     *
     * @param compiledService Service in internal format.
     * @param fileMergeMaps Maps containing references of merged split annotations.
     * @param schemaProvider Function which returns current service RawMetadata.
     * @param changes AVT changes to be converted.
     * @returns Annotation file changes.
     */
    convert(
        compiledService: CompiledService,
        fileMergeMaps: Record<string, Record<string, string>>,
        schemaProvider: SchemaProvider,
        changes: Change[]
    ): AnnotationFileChange[] {
        this.reset();

        const mergedChanges = mergeChanges(changes);

        for (const change of mergedChanges) {
            const file = this.getFile(compiledService, change.uri);
            const aliasInfoMod = this.getAliasInformation(file);

            if (change.kind === ChangeType.InsertAnnotation) {
                this.insertAnnotation(compiledService, aliasInfoMod, change);
            } else if (change.kind === ChangeType.InsertEmbeddedAnnotation) {
                this.insertEmbeddedAnnotation(file, fileMergeMaps, aliasInfoMod, change);
            } else if (change.kind === ChangeType.Insert) {
                this.convertInsert(file, fileMergeMaps, aliasInfoMod, change);
            } else if (change.kind === ChangeType.Delete) {
                this.convertDelete(file, fileMergeMaps, aliasInfoMod, change);
            } else if (change.kind === ChangeType.Update) {
                this.convertUpdate(file, fileMergeMaps, aliasInfoMod, schemaProvider, change);
            } else if (change.kind === ChangeType.Move) {
                this.convertMove(file, fileMergeMaps, aliasInfoMod, change);
            }
        }

        this.addTargetChanges(compiledService);

        return this.annotationFileChanges;
    }

    private getFile(compiledService: CompiledService, uri: string): AnnotationFile {
        const file = compiledService.annotationFiles.find((file) => file.uri === uri);
        if (!file) {
            if (this.ignoreChangedFileInitialContent) {
                return {
                    type: ANNOTATION_FILE_TYPE,
                    uri,
                    references: [],
                    targets: []
                };
            }
            throw new Error(`Invalid change. File ${uri} does not exist.`);
        }
        return file;
    }

    private insertAnnotation(
        compiledService: CompiledService,
        aliasInfo: AliasInformation,
        change: InsertAnnotationChange
    ): void {
        const annotationFile = compiledService.annotationFiles.find((file) => file.uri === change.uri);
        const targetName = toAliasQualifiedName(change.content.target, aliasInfo);
        const targetIndex = annotationFile?.targets.findIndex(
            (target) => toAliasQualifiedName(target.name, aliasInfo) === targetName
        );
        if (targetIndex === -1 || targetIndex === undefined) {
            // no existing target found, we need to create one
            const changesForUri = this.newTargetChanges.get(change.uri);
            if (!changesForUri) {
                this.newTargetChanges.set(
                    change.uri,
                    new Map<string, InsertAnnotationChange[]>([[targetName, [change]]])
                );
            } else {
                const changesForTarget = changesForUri.get(targetName);
                if (changesForTarget) {
                    changesForTarget.push(change);
                } else {
                    changesForUri.set(targetName, [change]);
                }
            }
        } else {
            // add annotation to existing target
            const internal: InsertElement = {
                type: INSERT_ELEMENT,
                uri: change.uri,
                target: targetName,
                pointer: `/targets/${targetIndex}`,
                element: convertAnnotationToInternal(change.content.value, aliasInfo)
            };
            this.annotationFileChanges.push(internal);
        }
    }

    private insertEmbeddedAnnotation(
        file: AnnotationFile,
        fileMergeMaps: Record<string, Record<string, string>>,
        aliasInfo: AliasInformation,
        change: InsertEmbeddedAnnotationChange
    ): void {
        const { reference, content } = change;
        const { targetPointer, internalPointer } = findAnnotationByReference(
            aliasInfo,
            file,
            fileMergeMaps[change.uri],
            reference,
            change.pointer,
            this.splitAnnotationSupport
        );

        const internal: InsertElement = {
            type: INSERT_ELEMENT,
            uri: change.uri,
            target: change.reference.target,
            element: convertAnnotationToInternal(content.value, aliasInfo),
            pointer: targetPointer + internalPointer,
            index: change.index
        };
        this.annotationFileChanges.push(internal);
    }

    private convertInsert(
        file: AnnotationFile,
        fileMergeMaps: Record<string, Record<string, string>>,
        aliasInfo: AliasInformation,
        change: InsertChange | UpdateChange
    ): void {
        const { reference, content } = change;
        const {
            element,
            targetPointer: pointer,
            internalPointer
        } = findAnnotationByReference(
            aliasInfo,
            file,
            fileMergeMaps[change.uri],
            reference,
            change.pointer,
            this.splitAnnotationSupport
        );
        const index = change.kind === ChangeType.Insert ? change.index : undefined;
        if (content.type === 'record') {
            const internal: InsertElement = {
                type: INSERT_ELEMENT,
                uri: change.uri,
                target: change.reference.target,
                pointer: pointer + internalPointer,
                element: convertRecordToInternal(aliasInfo, content.value),
                index
            };
            this.annotationFileChanges.push(internal);
        } else if (content.type === 'property-value') {
            const internal: InsertElement = {
                type: INSERT_ELEMENT,
                uri: change.uri,
                target: change.reference.target,
                pointer: pointer + internalPointer,
                element: convertPropertyValueToInternal(aliasInfo, content.value),
                index
            };
            this.annotationFileChanges.push(internal);
        } else if (content.type === 'collection') {
            const internal: InsertElement = {
                type: INSERT_ELEMENT,
                uri: change.uri,
                target: change.reference.target,
                pointer: pointer + internalPointer,
                element: convertCollectionToInternal(aliasInfo, content.value),
                index
            };
            this.annotationFileChanges.push(internal);
        } else if (content.type === 'expression') {
            this.convertInsertExpression(file, aliasInfo, pointer + internalPointer, change, content, index);
        } else if (content.type === 'primitive') {
            this.convertInsertPrimitive(element, aliasInfo, pointer, internalPointer, change, content, index);
        }
    }

    private convertInsertExpression(
        file: AnnotationFile,
        aliasInfoMod: AliasInformation,
        pointer: string,
        change: InsertChange | UpdateChange,
        content: ExpressionModificationContent | ExpressionUpdateContent,
        index: number | undefined
    ): void {
        const node = getGenericNodeFromPointer(file, pointer);
        if (node?.type === ELEMENT_TYPE && node.name === Edm.Collection) {
            const expression = convertExpressionToInternal(aliasInfoMod, content.value);
            if (expression) {
                const internal: InsertElement = {
                    type: INSERT_ELEMENT,
                    uri: change.uri,
                    target: change.reference.target,
                    pointer: pointer,
                    element: expression,
                    index
                };
                this.annotationFileChanges.push(internal);
            }
        } else {
            const container = convertExpressionToInternal(
                aliasInfoMod,
                content.value,
                createElementNode({ name: 'placeholder' })
            );
            if (container) {
                const expression = container.content[0];
                if (expression?.type === ELEMENT_TYPE) {
                    const internal: InsertElement = {
                        type: INSERT_ELEMENT,
                        uri: change.uri,
                        target: change.reference.target,
                        pointer: pointer,
                        element: expression,
                        index
                    };
                    this.annotationFileChanges.push(internal);
                    return;
                } else if (Object.keys(container.attributes).length > 0) {
                    const attribute = container.attributes[Object.keys(container.attributes)[0]];
                    const internal: InsertAttribute = {
                        type: INSERT_ATTRIBUTE,
                        uri: change.uri,
                        pointer: pointer,
                        name: attribute.name,
                        value: attribute.value
                    };
                    this.annotationFileChanges.push(internal);
                    return;
                }
            }
        }
    }

    private convertInsertPrimitive(
        element: Element,
        aliasInfoMod: AliasInformation,
        pointer: string,
        internalPointer: string,
        change: InsertChange | UpdateChange,
        content: PrimitiveModificationContent,
        index: number | undefined
    ): void {
        if (content.expressionType === ExpressionType.Unknown) {
            const attributePointer = convertPointerInAnnotationToInternal(
                element,
                // last segment is used to determine attribute name
                change.pointer.split('/').slice(0, -1).join('/')
            );
            const attributeName = getAttributeNameFromPointer(change.pointer);
            if (attributeName) {
                const value = convertPrimitiveValueToInternal(attributeName, content.value, aliasInfoMod);
                const internal: InsertAttribute = {
                    type: INSERT_ATTRIBUTE,
                    uri: change.uri,
                    pointer: pointer + attributePointer,
                    name: attributeName,
                    value: value
                };
                this.annotationFileChanges.push(internal);
            }
        } else if (content.expressionType === ExpressionType.Null) {
            const internal: InsertElement = {
                type: INSERT_ELEMENT,
                uri: change.uri,
                target: change.reference.target,
                pointer: pointer + internalPointer,
                element: createElementNode({ name: Edm.Null }),
                index
            };
            this.annotationFileChanges.push(internal);
        } else if (typeof content.expressionType === 'string') {
            const internal: InsertAttribute = {
                type: INSERT_ATTRIBUTE,
                uri: change.uri,
                pointer: pointer + internalPointer,
                name: content.expressionType,
                value: content.value.toString()
            };
            this.annotationFileChanges.push(internal);
        }
    }

    private convertDelete(
        file: AnnotationFile,
        fileMergeMaps: Record<string, Record<string, string>>,
        aliasInfo: AliasInformation,
        change: DeleteChange
    ): void {
        const { reference } = change;
        const {
            target,
            targetPointer: pointer,
            internalPointer
        } = findAnnotationByReference(
            aliasInfo,
            file,
            fileMergeMaps[change.uri],
            reference,
            change.pointer,
            this.splitAnnotationSupport
        );
        // look for attribute pointer suffix e.g attributes/Qualifier/value
        const suffix = internalPointer.split('/').slice(-3);
        if (suffix[0] === 'attributes' && suffix.length === 3) {
            // its an attribute change
            const [, , property] = suffix;
            if (property === 'value') {
                const internal: DeleteAttribute = {
                    type: DELETE_ATTRIBUTE,
                    uri: change.uri,
                    pointer: pointer + internalPointer.split('/').slice(0, -1).join('/')
                };
                this.annotationFileChanges.push(internal);
            }
        } else if (change.pointer === '') {
            const internal: DeleteElement = {
                type: DELETE_ELEMENT,
                target: target.name,
                uri: change.uri,
                pointer: pointer
            };
            this.annotationFileChanges.push(internal);
        } else if (internalPointer !== '') {
            const internal: DeleteElement = {
                type: DELETE_ELEMENT,
                uri: change.uri,
                target: target.name,
                pointer: pointer + internalPointer
            };
            this.annotationFileChanges.push(internal);
        }
    }

    private convertUpdate(
        file: AnnotationFile,
        fileMergeMaps: Record<string, Record<string, string>>,
        aliasInfo: AliasInformation,
        schemaProvider: SchemaProvider,
        change: UpdateChange
    ): void {
        const { reference, content } = change;
        const valueType = this.getValueType(schemaProvider, change);
        const {
            element,
            targetPointer: pointer,
            internalPointer
        } = findAnnotationByReference(
            aliasInfo,
            file,
            fileMergeMaps[change.uri],
            reference,
            change.pointer,
            this.splitAnnotationSupport,
            valueType
        );
        if (internalPointer === '') {
            // value does not exist, treat this as insert
            this.convertInsert(file, fileMergeMaps, aliasInfo, change);
            return;
        }
        // look for attribute pointer suffix e.g attributes/Qualifier/value
        const suffix = internalPointer.split('/').slice(-3);
        if (suffix[0] === 'attributes' && suffix.length === 3) {
            // its an attribute change
            const [, attributeName, property] = suffix;
            this.convertUpdateAttribute(aliasInfo, attributeName, property, pointer, internalPointer, change);
        } else if (content.type === 'expression' && content.value.type === 'Collection') {
            const node = getGenericNodeFromPointer(file, pointer + internalPointer);
            const newElement = convertExpressionToInternal(aliasInfo, content.value);
            if (node?.type === ELEMENT_TYPE && newElement) {
                const internalChange: ReplaceElement = {
                    type: REPLACE_ELEMENT,
                    uri: change.uri,
                    pointer: pointer + internalPointer,
                    newElement
                };
                this.annotationFileChanges.push(internalChange);
            }
        } else if (content.type === 'expression') {
            this.convertUpdateExpression(
                file,
                aliasInfo,
                content,
                pointer + internalPointer,
                valueType,
                reference.target
            );
        } else if (content.type === 'primitive' && content.value !== undefined) {
            const internalPointerForPrimitiveValues = convertPointerInAnnotationToInternal(
                element,
                change.pointer,
                content.expressionType
            );
            const replaceTextPointer = pointer + internalPointerForPrimitiveValues + '/text';
            this.convertUpdatePrimitiveValue(file, aliasInfo, content, pointer + internalPointer, replaceTextPointer);
        } else {
            const element = convertChangeToElement(aliasInfo, file, change);
            if (element) {
                const internal: ReplaceElement = {
                    type: REPLACE_ELEMENT,
                    uri: change.uri,
                    pointer: pointer + internalPointer,
                    newElement: element
                };
                this.annotationFileChanges.push(internal);
            }
        }
    }

    private convertUpdateAttribute(
        aliasInfo: AliasInformation,
        attributeName: string,
        property: string,
        pointer: string,
        internalPointer: string,
        change: UpdateChange
    ): void {
        const value = this.getAttributeValue(change.content);
        if (property === 'value' && value !== undefined) {
            const type = this.getPrimitiveValueType(change.content) ?? attributeName;
            const newValue = convertPrimitiveValueToInternal(type, value, aliasInfo);

            const internal: UpdateAttributeValue = {
                type: UPDATE_ATTRIBUTE_VALUE,
                uri: change.uri,
                pointer: pointer + internalPointer.split('/').slice(0, -1).join('/'),
                newValue
            };
            this.annotationFileChanges.push(internal);
        }
    }

    private getPrimitiveValueType(content: UpdateContent): string | undefined {
        if (content.type === 'primitive') {
            if (content.expressionType === ExpressionType.Unknown) {
                return undefined;
            }
            return content.expressionType;
        }
        if (content.type === 'expression') {
            if (content.value.type === ExpressionType.Unknown) {
                return undefined;
            }
            return content.value.type;
        }
        return undefined;
    }

    private getAttributeValue(content: UpdateContent): string | number | boolean | undefined {
        if (content.type === 'primitive') {
            return content.value;
        }
        if (content.type === 'expression') {
            return this.getExpressionValue(content);
        }
        return undefined;
    }

    private getExpressionValue(content: ExpressionUpdateContent): string | number | boolean {
        return (content.value as any)[content.value.type]; // There is always a property with on the object as type name, Typescript does not infer this case as expected
    }

    private convertUpdateExpression(
        file: AnnotationFile,
        aliasInfo: AliasInformation,
        content: ExpressionUpdateContent,
        pointer: string,
        valueType: string | undefined,
        targetName: string
    ): void {
        const rawPrimitiveValue = this.getExpressionValue(content);
        const newValue = convertPrimitiveValueToInternal(content.value.type, rawPrimitiveValue, aliasInfo);
        const type = valueType ?? content.value.type;
        const node = getGenericNodeFromPointer(file, pointer);
        if (node?.type === ELEMENT_TYPE) {
            const onlyChangeValue = content.previousType === undefined && content.value.type === valueType;
            if (onlyChangeValue && node.attributes[type]) {
                // attribute notation
                const internalChange: UpdateAttributeValue = {
                    type: UPDATE_ATTRIBUTE_VALUE,
                    uri: file.uri,
                    pointer: pointer + `/attributes/${type}`,
                    newValue
                };
                this.annotationFileChanges.push(internalChange);
            } else if (onlyChangeValue && node.name === valueType) {
                // element notation
                const internalChange: ReplaceElementContent = {
                    type: REPLACE_ELEMENT_CONTENT,
                    uri: file.uri,
                    pointer: pointer,
                    newValue: [createTextNode(newValue)]
                };
                this.annotationFileChanges.push(internalChange);
            } else if (node.attributes[type]) {
                // attribute notation
                this.annotationFileChanges.push({
                    type: REPLACE_ATTRIBUTE,
                    uri: file.uri,
                    pointer: pointer + `/attributes/${type}`,
                    newAttributeName: content.value.type,
                    newAttributeValue: newValue
                });
            } else if (node.name === valueType) {
                // element notation
                const childContent: ElementChild[] = [];
                if (content.value.type !== Edm.Null) {
                    childContent.push(createTextNode(newValue));
                }
                const internalChange: ReplaceElement = {
                    type: REPLACE_ELEMENT,
                    uri: file.uri,
                    pointer: pointer,
                    newElement: createElementNode({
                        name: content.value.type,
                        content: childContent
                    })
                };
                this.annotationFileChanges.push(internalChange);
            }
        } else if (node?.type === ATTRIBUTE_TYPE) {
            this.convertUpdateExpressionForAttrributeType(file.uri, targetName, valueType, content, pointer, newValue);
        }
    }

    private convertUpdateExpressionForAttrributeType(
        fileUri: string,
        targetName: string,
        valueType: string | undefined,
        content: ExpressionUpdateContent,
        pointer: string,
        newValue: string
    ): void {
        if (content.previousType === undefined && content.value.type === valueType) {
            // attribute notation
            const internalChange: UpdateAttributeValue = {
                type: UPDATE_ATTRIBUTE_VALUE,
                uri: fileUri,
                pointer: pointer,
                newValue
            };
            this.annotationFileChanges.push(internalChange);
        } else if (content.value.type === Edm.Null) {
            this.annotationFileChanges.push({
                type: DELETE_ATTRIBUTE,
                uri: fileUri,
                pointer: pointer
            });
            this.annotationFileChanges.push({
                type: INSERT_ELEMENT,
                uri: fileUri,
                target: targetName,
                pointer: pointer.split('/').slice(0, -2).join('/'),
                element: createElementNode({ name: Edm.Null })
            });
        } else {
            // attribute notation
            const internalChange: ReplaceAttribute = {
                type: REPLACE_ATTRIBUTE,
                uri: fileUri,
                pointer: pointer,
                newAttributeName: content.value.type,
                newAttributeValue: newValue
            };
            this.annotationFileChanges.push(internalChange);
        }
    }

    private convertUpdatePrimitiveValue(
        file: AnnotationFile,
        aliasInfo: AliasInformation,
        content: PrimitiveModificationContent,
        pointer: string,
        replaceTextPointer: string
    ) {
        const newValue = convertPrimitiveValueToInternal(content.expressionType ?? '', content.value, aliasInfo);
        const node = getGenericNodeFromPointer(file, pointer);
        if (node?.type === TEXT_TYPE) {
            const containerPointer = pointer.split('/').slice(0, -2).join('/');
            const container = getGenericNodeFromPointer(file, containerPointer);
            if (
                container?.type === ELEMENT_TYPE &&
                content.expressionType &&
                container.name !== content.expressionType
            ) {
                const internal: ReplaceElement = {
                    type: REPLACE_ELEMENT,
                    uri: file.uri,
                    pointer: containerPointer,
                    newElement: createElementNode({
                        name: content.expressionType,
                        content: [createTextNode(newValue)]
                    })
                };
                this.annotationFileChanges.push(internal);
                return;
            }
        } else if (
            node?.type === ELEMENT_TYPE &&
            content.expressionType &&
            replaceTextPointer.split('/').includes('attributes')
        ) {
            const oldAttributeName = replaceTextPointer.split('/').slice(-2)[0];
            if (node.attributes[content.expressionType]) {
                const internal: UpdateAttributeValue = {
                    type: UPDATE_ATTRIBUTE_VALUE,
                    uri: file.uri,
                    pointer: `${pointer}/attributes/${content.expressionType}`,
                    newValue
                };
                this.annotationFileChanges.push(internal);
                return;
            } else {
                const internal: ReplaceAttribute = {
                    type: REPLACE_ATTRIBUTE,
                    uri: file.uri,
                    pointer: `${pointer}/attributes/${oldAttributeName}`,
                    newAttributeName: content.expressionType,
                    newAttributeValue: newValue
                };
                this.annotationFileChanges.push(internal);
                return;
            }
        }
        const internal: ReplaceText = {
            type: REPLACE_TEXT,
            uri: file.uri,
            pointer: replaceTextPointer,
            text: createTextNode(newValue)
        };
        this.annotationFileChanges.push(internal);
    }

    private convertMove(
        file: AnnotationFile,
        fileMergeMaps: Record<string, Record<string, string>>,
        aliasInfo: AliasInformation,
        change: MoveChange
    ): void {
        const { reference, index, moveReference } = change;
        const { targetPointer: pointer, internalPointer } = findAnnotationByReference(
            aliasInfo,
            file,
            fileMergeMaps[change.uri],
            reference,
            change.pointer,
            this.splitAnnotationSupport
        );
        const internal: MoveElements = {
            type: MOVE_ELEMENT,
            uri: change.uri,
            pointer: pointer + internalPointer,
            index: index,
            fromPointers: moveReference.reduce((acc, moveRef) => {
                acc.push(
                    ...moveRef.fromPointer.map((fromPointer) => {
                        const { targetPointer: fromTargetPointer, internalPointer: internalFromPointer } =
                            findAnnotationByReference(
                                aliasInfo,
                                file,
                                fileMergeMaps[change.uri],
                                moveRef.reference ?? change.reference,
                                fromPointer,
                                this.splitAnnotationSupport
                            );
                        return fromTargetPointer + internalFromPointer;
                    })
                );
                return acc;
            }, new Array<JsonPointer>())
        };
        this.annotationFileChanges.push(internal);
    }

    private addTargetChanges(compiledService: CompiledService): void {
        const insertTargetChanges: InsertTarget[] = [];
        for (const [uri, changesForUri] of this.newTargetChanges) {
            const file = this.getFile(compiledService, uri);
            const aliasInfoMod = this.getAliasInformation(file);
            for (const [targetName, inserts] of changesForUri) {
                const target = createTarget(targetName);
                target.terms = inserts.map((change) => convertAnnotationToInternal(change.content.value, aliasInfoMod));
                const internal: InsertTarget = {
                    type: INSERT_TARGET,
                    uri: uri,
                    target
                };
                insertTargetChanges.push(internal);
            }
        }
        this.annotationFileChanges.unshift(...insertTargetChanges);
    }

    private getValueType(schemaProvider: SchemaProvider, change: UpdateChange): string | undefined {
        const { content } = change;
        if (content.type === 'expression') {
            if (content.previousType) {
                return content.previousType;
            }
            return this.getValueTypeFromSchema(schemaProvider, change);
        }
        // else if (content.type === 'primitive') {
        //     if (content.expressionType) {
        //         return content.expressionType;
        //     }
        //     return this.getValueTypeFromSchema(schemaProvider, change);
        // }
        return undefined;
    }

    private getValueTypeFromSchema(schemaProvider: SchemaProvider, change: UpdateChange): string | undefined {
        const { reference, uri, pointer } = change;
        const annotationLists = schemaProvider().schema.annotations[uri] ?? [];
        const annotation = findAnnotation(annotationLists, reference);
        if (!annotation) {
            const refString = annotationReferenceToString(reference, uri);
            throw new ApiError(`Could not find annotation '${refString}' in file '${uri}'.`, ApiErrorCode.General);
        }

        const node = getAvtNodeFromPointer(annotation, pointer);
        if (!node) {
            const refString = annotationReferenceToString(reference, uri);
            throw new ApiError(
                `Could not resolve pointer '${pointer}' from annotation '${refString}'.`,
                ApiErrorCode.General
            );
        }
        if (this.isExpression(node)) {
            return node.type;
        }
        return undefined;
    }

    private isExpression(node: AVTNode): node is Expression {
        return typeof (node as any).type !== 'undefined' && typeof (node as any).propertyValues === 'undefined';
    }

    private getAliasInformation(file: AnnotationFile): AliasInformation {
        const cachedValue = this.aliasInfoCache[file.uri];
        if (cachedValue) {
            return cachedValue;
        }
        const namespaces = getAllNamespacesAndReferences(
            file.namespace ?? { name: this.serviceName, type: 'namespace' },
            file.references
        );

        const aliasInfo = getAliasInformation(namespaces, this.metadataService.getNamespaces());
        const aliasInfoWithAllVocabularies = addAllVocabulariesToAliasInformation(
            aliasInfo,
            this.vocabularyAPI.getVocabularies()
        );
        this.aliasInfoCache[file.uri] = aliasInfoWithAllVocabularies;
        return aliasInfoWithAllVocabularies;
    }

    private reset() {
        this.aliasInfoCache = {};
        this.newTargetChanges = new Map<string, Map<string, InsertAnnotationChange[]>>();
        this.annotationFileChanges = [];
    }
}

function mergeChanges(changes: Change[]): Change[] {
    const result: Change[] = [];

    const inserts = changes
        .filter((change): change is InsertAnnotationChange => change.kind === ChangeType.InsertAnnotation)
        .reduce((acc, change: InsertAnnotationChange) => {
            const reference: AnnotationReference = {
                target: change.content.target,
                term: change.content.value.term,
                qualifier: change.content.value.qualifier
            };
            const key = annotationReferenceToString(reference, change.uri);
            acc.set(key, change);

            return acc;
        }, new Map<string, InsertAnnotationChange>());

    for (const change of changes) {
        if (change.kind === ChangeType.InsertAnnotation) {
            // don't do anything with annotation inserts
            result.push(change);
            continue;
        }
        const key = annotationReferenceToString(change.reference, change.uri);
        const insert = inserts.get(key);
        if (!insert) {
            // reference should exist -> continue normally
            result.push(change);
            continue;
        }
        // new annotation should exist only in memory -> merge changes
        mergeChange(insert, change);
    }

    return result;
}

function mergeChange(target: InsertAnnotationChange, source: Exclude<Change, InsertAnnotationChange>): void {
    const reference = annotationReferenceToString(source.reference, source.uri);
    switch (source.kind) {
        case ChangeType.InsertEmbeddedAnnotation: {
            if (target.content.value.annotations) {
                target.content.value.annotations.push(source.content.value);
            } else {
                target.content.value.annotations = [source.content.value];
            }
            return;
        }
        case ChangeType.Insert: {
            const node = getAvtNodeFromPointer(target.content.value, source.pointer);
            if (!node) {
                throw new ApiError(
                    `Change merge for '${reference}' failed! Could not resolve '${source.pointer}'.`,
                    ApiErrorCode.General
                );
            }
            if (Array.isArray(node) && source.content.type === 'record') {
                if (source.index === undefined || source.index >= node.length) {
                    (node as AnnotationRecord[]).push(source.content.value);
                } else {
                    (node as AnnotationRecord[]).splice(source.index, 0, source.content.value);
                }
                return;
            }
            throw new ApiError(
                `Change merge for '${reference}' failed! Change value type '${source.content.type}' is not supported.`,
                ApiErrorCode.General
            );
        }
        default:
            break;
    }
    throw new ApiError(
        `Change merge for '${reference}' failed! Change type '${source.kind}' is not supported.`,
        ApiErrorCode.General
    );
}

function convertChangeToElement(
    aliasInfoMod: AliasInformation,
    file: AnnotationFile,
    change: InsertChange | UpdateChange
): Element | undefined {
    if (change.content.type === 'record') {
        const { content } = change;
        return convertRecordToInternal(aliasInfoMod, content.value);
    } else if (change.content.type === 'property-value') {
        const { content } = change;

        return convertPropertyValueToInternal(aliasInfoMod, content.value);
    } else if (change.content.type === 'collection') {
        const { content } = change;
        return convertCollectionToInternal(aliasInfoMod, content.value);
    } else if (change.content.type === 'expression') {
        const { content } = change;
        return convertExpressionToInternal(aliasInfoMod, content.value);
    } else if (change.content.type === 'primitive') {
        const { content } = change;
        if (content.expressionType === ExpressionType.Null) {
            return createElementNode({ name: Edm.Null });
        }
    }
    return undefined;
}

function getAttributeNameFromPointer(pointer: JsonPointer): string | undefined {
    const lastSegment = pointer.split('/').slice(-1)[0];
    // new primitive value: can always be added as attributes, namespaces are already replaced
    if (lastSegment?.length) {
        // convert property names used in AVT types to attribute names (e.g. 'type', 'term' and 'qualifier')
        // (EDMX Attribute names always start with upper case letter)
        return lastSegment.substring(0, 1).toUpperCase() + lastSegment.substring(1);
    }
    return undefined;
}
