import type { AliasInformation, AnnotationFile, Element } from '@sap-ux/odata-annotation-core-types';
import {
    ELEMENT_TYPE,
    ATTRIBUTE_TYPE,
    createElementNode,
    createTextNode,
    Edm
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
    UpdateChange
} from './types';
import { ChangeType, ExpressionType, INSERT_ELEMENT } from './types';
import { annotationReferenceToString, getGenericNodeFromPointer } from './utils';
import { ApiError, ApiErrorCode } from './error';

export type SchemaProvider = () => RawMetadata;
/**
 * Converts changes to the internal change format.
 */
export class ChangeConverter {
    private aliasInfoCache: Record<string, AliasInformation> = {};
    /**
     *
     * @param serviceName Name of the service.
     * @param vocabularyAPI Vocabulary API instance.
     * @param metadataService Metadata service.
     * @param splitAnnotationSupport Flag indicating if partial annotation definitions are supported.
     */
    constructor(
        private serviceName: string,
        private vocabularyAPI: VocabularyService,
        private metadataService: MetadataService,
        private splitAnnotationSupport: boolean
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
        const annotationFileChanges: AnnotationFileChange[] = [];
        const mergedChanges = mergeChanges(changes);
        const newTargetChanges = new Map<string, Map<string, InsertAnnotationChange[]>>();
        for (const change of mergedChanges) {
            const file = compiledService.annotationFiles.find((file) => file.uri === change.uri);
            if (!file) {
                throw new Error(`Invalid change. File ${change.uri} does not exist.`);
            }
            const aliasInfoMod = this.getAliasInformation(file);

            if (change.kind === ChangeType.InsertAnnotation) {
                const annotationFile = compiledService.annotationFiles.find((file) => file.uri === change.uri);
                const targetName = toAliasQualifiedName(change.content.target, aliasInfoMod);
                const targetIndex = annotationFile?.targets.findIndex(
                    (target) => toAliasQualifiedName(target.name, aliasInfoMod) === targetName
                );
                if (targetIndex === -1) {
                    // no existing target found, we need to create one
                    const changesForUri = newTargetChanges.get(change.uri);
                    if (!changesForUri) {
                        newTargetChanges.set(
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
                        type: 'insert-element',
                        uri: change.uri,
                        target: targetName,
                        pointer: `/targets/${targetIndex}`,
                        element: convertAnnotationToInternal(change.content.value, aliasInfoMod)
                    };
                    annotationFileChanges.push(internal);
                }
            } else if (change.kind === ChangeType.InsertEmbeddedAnnotation) {
                const { reference, content } = change;
                const { targetPointer, internalPointer } = findAnnotationByReference(
                    aliasInfoMod,
                    file,
                    fileMergeMaps[change.uri],
                    reference,
                    change.pointer,
                    this.splitAnnotationSupport
                );

                const internal: InsertElement = {
                    type: 'insert-element',
                    uri: change.uri,
                    target: change.reference.target,
                    element: convertAnnotationToInternal(content.value, aliasInfoMod),
                    pointer: targetPointer + internalPointer
                };
                annotationFileChanges.push(internal);
            } else if (change.kind === ChangeType.Insert) {
                const internalChange = this.convertInsert(file, fileMergeMaps, aliasInfoMod, change);
                if (internalChange) {
                    annotationFileChanges.push(internalChange);
                }
            } else if (change.kind === ChangeType.Delete) {
                const { reference } = change;
                const {
                    target,
                    targetPointer: pointer,
                    internalPointer
                } = findAnnotationByReference(
                    aliasInfoMod,
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
                            type: 'delete-attribute',
                            uri: change.uri,
                            pointer: pointer + internalPointer.split('/').slice(0, -1).join('/')
                        };
                        annotationFileChanges.push(internal);
                    }
                } else if (change.pointer === '') {
                    const internal: DeleteElement = {
                        type: 'delete-element',
                        target: target.name,
                        uri: change.uri,
                        pointer: pointer
                    };
                    annotationFileChanges.push(internal);
                } else if (internalPointer !== '') {
                    const internal: DeleteElement = {
                        type: 'delete-element',
                        uri: change.uri,
                        target: target.name,
                        pointer: pointer + internalPointer
                    };
                    annotationFileChanges.push(internal);
                }
            } else if (change.kind === ChangeType.Update) {
                const { reference, content } = change;
                const valueType = this.getValueType(schemaProvider, change);
                const {
                    element,
                    targetPointer: pointer,
                    internalPointer
                } = findAnnotationByReference(
                    aliasInfoMod,
                    file,
                    fileMergeMaps[change.uri],
                    reference,
                    change.pointer,
                    this.splitAnnotationSupport,
                    valueType
                );
                if (internalPointer === '') {
                    // value does not exist, treat this as insert
                    const internalChange = this.convertInsert(file, fileMergeMaps, aliasInfoMod, change);
                    if (internalChange) {
                        annotationFileChanges.push(internalChange);
                    }
                } else {
                    // look for attribute pointer suffix e.g attributes/Qualifier/value
                    const suffix = internalPointer.split('/').slice(-3);
                    if (suffix[0] === 'attributes' && suffix.length === 3) {
                        // its an attribute change
                        const [, attributeName, property] = suffix;
                        if (property === 'value') {
                            // TODO: move this logic to convertPrimitiveValueToInternal
                            let newValue = content.value.toString();
                            if (
                                attributeName === Edm.Type ||
                                attributeName === Edm.EnumMember ||
                                attributeName === Edm.Term
                            ) {
                                newValue = toAliasQualifiedName(change.content.value.toString(), aliasInfoMod);
                            }
                            if (content.type === 'primitive' && content.expressionType === Edm.AnnotationPath) {
                                newValue = convertPrimitiveValueToInternal(
                                    Edm.AnnotationPath,
                                    content.value.toString(),
                                    aliasInfoMod
                                );
                            }
                            const internal: UpdateAttributeValue = {
                                type: 'update-attribute-value',
                                uri: change.uri,
                                pointer: pointer + internalPointer.split('/').slice(0, -1).join('/'),
                                newValue
                            };
                            annotationFileChanges.push(internal);
                        }
                    } else if (content.type === 'expression' && content.value.type === 'Collection') {
                        const node = getGenericNodeFromPointer(file, pointer + internalPointer);
                        const newElement = convertExpressionToInternal(aliasInfoMod, content.value);
                        if (node?.type === ELEMENT_TYPE && newElement) {
                            const internalChange: ReplaceElement = {
                                type: 'replace-element',
                                uri: change.uri,
                                pointer: pointer + internalPointer,
                                newElement
                            };
                            annotationFileChanges.push(internalChange);
                        }
                    } else if (content.type === 'expression') {
                        const rawPrimitiveValue = (content.value as any)[content.value.type]; // There is always a property with on the object as type name, Typescript does not infer this case as expected
                        const newValue = convertPrimitiveValueToInternal(
                            content.value.type,
                            rawPrimitiveValue,
                            aliasInfoMod
                        );
                        const type = valueType ?? content.value.type;
                        const node = getGenericNodeFromPointer(file, pointer + internalPointer);
                        if (node?.type === ELEMENT_TYPE) {
                            if (content.previousType === undefined && content.value.type === valueType) {
                                if (node.attributes[type]) {
                                    // attribute notation
                                    const internalChange: UpdateAttributeValue = {
                                        type: 'update-attribute-value',
                                        uri: change.uri,
                                        pointer: pointer + internalPointer + `/attributes/${type}`,
                                        newValue
                                    };
                                    annotationFileChanges.push(internalChange);
                                } else if (node.name === valueType) {
                                    // element notation
                                    const internalChange: ReplaceElementContent = {
                                        type: 'replace-element-content',
                                        uri: change.uri,
                                        pointer: pointer + internalPointer,
                                        newValue: [createTextNode(newValue)]
                                    };
                                    annotationFileChanges.push(internalChange);
                                }
                            } else if (node.attributes[type]) {
                                // attribute notation
                                const internalChange: ReplaceAttribute = {
                                    type: 'replace-attribute',
                                    uri: change.uri,
                                    pointer: pointer + internalPointer + `/attributes/${type}`,
                                    newAttributeName: content.value.type,
                                    newAttributeValue: newValue
                                };
                                annotationFileChanges.push(internalChange);
                            } else if (node.name === valueType) {
                                // element notation
                                const internalChange: ReplaceElement = {
                                    type: 'replace-element',
                                    uri: change.uri,
                                    pointer: pointer + internalPointer,
                                    newElement: createElementNode({
                                        name: content.value.type,
                                        content: [createTextNode(newValue)]
                                    })
                                };
                                annotationFileChanges.push(internalChange);
                            }
                        } else if (node?.type === ATTRIBUTE_TYPE) {
                            if (content.previousType === undefined && content.value.type === valueType) {
                                // attribute notation
                                const internalChange: UpdateAttributeValue = {
                                    type: 'update-attribute-value',
                                    uri: change.uri,
                                    pointer: pointer + internalPointer,
                                    newValue
                                };
                                annotationFileChanges.push(internalChange);
                            } else {
                                // attribute notation
                                const internalChange: ReplaceAttribute = {
                                    type: 'replace-attribute',
                                    uri: change.uri,
                                    pointer: pointer + internalPointer,
                                    newAttributeName: content.value.type,
                                    newAttributeValue: newValue
                                };
                                annotationFileChanges.push(internalChange);
                            }
                        }
                    } else if (content.type === 'primitive' && content.value !== undefined) {
                        const internalPointerForPrimitiveValues = convertPointerInAnnotationToInternal(
                            element,
                            change.pointer,
                            content.expressionType
                        );
                        let newValue = content.value.toString();
                        if (content.expressionType === Edm.AnnotationPath) {
                            newValue = convertPrimitiveValueToInternal(
                                Edm.AnnotationPath,
                                content.value.toString(),
                                aliasInfoMod
                            );
                        }
                        const internal: ReplaceText = {
                            type: 'replace-text',
                            uri: change.uri,
                            pointer: pointer + internalPointerForPrimitiveValues + '/text',
                            text: createTextNode(newValue)
                        };
                        annotationFileChanges.push(internal);
                    } else {
                        const element = convertChangeToElement(aliasInfoMod, file, change);
                        if (element) {
                            const internal: ReplaceElement = {
                                type: 'replace-element',
                                uri: change.uri,
                                pointer: pointer + internalPointer,
                                newElement: element
                            };
                            annotationFileChanges.push(internal);
                        }
                    }
                }
            } else if (change.kind === ChangeType.Move) {
                const { reference, index, moveReference } = change;
                const { targetPointer: pointer, internalPointer } = findAnnotationByReference(
                    aliasInfoMod,
                    file,
                    fileMergeMaps[change.uri],
                    reference,
                    change.pointer,
                    this.splitAnnotationSupport
                );
                const internal: MoveElements = {
                    type: 'move-element',
                    uri: change.uri,
                    pointer: pointer + internalPointer,
                    index: index,
                    fromPointers: moveReference?.reduce((acc, moveRef) => {
                        acc.push(
                            ...moveRef.fromPointer.map((fromPointer) => {
                                const { targetPointer: fromTargetPointer, internalPointer: internalFromPointer } =
                                    findAnnotationByReference(
                                        aliasInfoMod,
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
                annotationFileChanges.push(internal);
            }
        }
        const insertTargetChanges: InsertTarget[] = [];
        for (const [uri, changesForUri] of newTargetChanges) {
            const file = compiledService.annotationFiles.find((file) => file.uri === uri);
            if (!file) {
                throw new Error(`Invalid change. File ${uri} does not exist.`);
            }
            const aliasInfoMod = this.getAliasInformation(file);
            for (const [targetName, inserts] of changesForUri) {
                const internal: InsertTarget = {
                    type: 'insert-target',
                    uri: uri,
                    target: {
                        type: 'target',
                        name: targetName,
                        terms: inserts.map((change) => convertAnnotationToInternal(change.content.value, aliasInfoMod))
                    }
                };
                insertTargetChanges.push(internal);
            }
        }
        annotationFileChanges.unshift(...insertTargetChanges);
        return annotationFileChanges;
    }

    private convertInsert(
        file: AnnotationFile,
        fileMergeMaps: Record<string, Record<string, string>>,
        aliasInfoMod: AliasInformation,
        change: InsertChange | UpdateChange
    ): AnnotationFileChange | undefined {
        const { reference, content } = change;
        const {
            element,
            targetPointer: pointer,
            internalPointer
        } = findAnnotationByReference(
            aliasInfoMod,
            file,
            fileMergeMaps[change.uri],
            reference,
            change.pointer,
            this.splitAnnotationSupport
        );
        if (content.type === 'record') {
            const internal: InsertElement = {
                type: INSERT_ELEMENT,
                uri: change.uri,
                target: change.reference.target,
                pointer: pointer + internalPointer,
                element: convertRecordToInternal(aliasInfoMod, content.value),
                index: change.kind === ChangeType.Insert ? change.index : undefined
            };
            return internal;
        } else if (content.type === 'property-value') {
            const internal: InsertElement = {
                type: INSERT_ELEMENT,
                uri: change.uri,
                target: change.reference.target,
                pointer: pointer + internalPointer,
                element: convertPropertyValueToInternal(aliasInfoMod, content.value),
                index: change.kind === ChangeType.Insert ? change.index : undefined
            };
            return internal;
        } else if (content.type === 'collection') {
            const internal: InsertElement = {
                type: INSERT_ELEMENT,
                uri: change.uri,
                target: change.reference.target,
                pointer: pointer + internalPointer,
                element: convertCollectionToInternal(aliasInfoMod, content.value),
                index: change.kind === ChangeType.Insert ? change.index : undefined
            };
            return internal;
        } else if (content.type === 'expression') {
            const node = getGenericNodeFromPointer(file, pointer + internalPointer);
            if (node?.type === ELEMENT_TYPE && node.name === Edm.Collection) {
                const expression = convertExpressionToInternal(aliasInfoMod, content.value);
                if (expression) {
                    const internal: InsertElement = {
                        type: INSERT_ELEMENT,
                        uri: change.uri,
                        target: change.reference.target,
                        pointer: pointer + internalPointer,
                        element: expression
                    };
                    return internal;
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
                            pointer: pointer + internalPointer,
                            element: expression
                        };
                        return internal;
                    } else if (Object.keys(container.attributes).length > 0) {
                        const attribute = container.attributes[Object.keys(container.attributes)[0]];
                        const internal: InsertAttribute = {
                            type: 'insert-attribute',
                            uri: change.uri,
                            pointer: pointer + internalPointer,
                            name: attribute.name,
                            value: attribute.value
                        };
                        return internal;
                    }
                }
            }
        } else if (content.type === 'primitive') {
            if (content.expressionType === ExpressionType.Unknown) {
                const internalPointer = convertPointerInAnnotationToInternal(
                    element,
                    // last segment is used to determine attribute name
                    change.pointer.split('/').slice(0, -1).join('/')
                );
                const attributeName = getAttributeNameFromPointer(change.pointer);
                if (attributeName) {
                    const value =
                        attributeName === Edm.Type
                            ? toAliasQualifiedName(content.value.toString(), aliasInfoMod)
                            : content.value.toString();
                    const internal: InsertAttribute = {
                        type: 'insert-attribute',
                        uri: change.uri,
                        pointer: pointer + internalPointer,
                        name: attributeName,
                        value: value
                    };
                    return internal;
                }
            } else if (content.expressionType === ExpressionType.Null) {
                const internal: InsertElement = {
                    type: INSERT_ELEMENT,
                    uri: change.uri,
                    target: change.reference.target,
                    pointer: pointer + internalPointer,
                    element: createElementNode({ name: Edm.Null })
                };
                return internal;
            } else if (typeof content.expressionType === 'string') {
                const internal: InsertAttribute = {
                    type: 'insert-attribute',
                    uri: change.uri,
                    pointer: pointer + internalPointer,
                    name: content.expressionType,
                    value: content.value.toString()
                };
                return internal;
            }
        }
        return undefined;
    }

    private getValueType(schemaProvider: SchemaProvider, change: UpdateChange): string | undefined {
        const { reference, content, uri, pointer } = change;
        if (content.type === 'expression') {
            if (content.previousType) {
                return content.previousType;
            }

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
