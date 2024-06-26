import { fileURLToPath, pathToFileURL } from 'url';
import { basename, dirname, join, relative, sep } from 'path';

import { TextDocument } from 'vscode-languageserver-textdocument';

import type { CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';
import {
    createCdsCompilerFacadeForRoot,
    createMetadataCollector,
    getMetadataElementsFromMap
} from '@sap/ux-cds-compiler-facade';
import {
    TEXT_TYPE,
    ELEMENT_TYPE,
    DiagnosticSeverity,
    createAttributeNode,
    createElementNode,
    createTextNode
} from '@sap-ux/odata-annotation-core-types';
import type {
    AnnotationFile,
    WorkspaceEdit,
    TextEdit,
    AliasInformation,
    Target,
    CompilerMessage,
    MetadataElement,
    AnyNode,
    Element
} from '@sap-ux/odata-annotation-core-types';

import { MetadataService } from '@sap-ux/odata-entity-model';
import type { Project } from '@sap-ux/project-access';
import type { Record } from '@sap-ux/cds-annotation-parser';
import {
    ANNOTATION_GROUP_ITEMS_TYPE,
    ANNOTATION_TYPE,
    COLLECTION_TYPE,
    QUALIFIER_TYPE,
    RECORD_PROPERTY_TYPE,
    RECORD_TYPE,
    isReservedProperty
} from '@sap-ux/cds-annotation-parser';
import {
    Edm,
    getAliasInformation,
    getAllNamespacesAndReferences,
    isElementWithName,
    parseIdentifier,
    toFullyQualifiedName
} from '@sap-ux/odata-annotation-core';
import { TARGET_TYPE, printTarget } from '@sap-ux/cds-odata-annotation-converter';

import type { VocabularyService } from '@sap-ux/odata-vocabularies';

import {
    type CompiledService,
    type TextFile,
    type AnnotationServiceAdapter,
    type AnnotationFileChange,
    type CDSService,
    type InsertTarget,
    type DeleteElement,
    type InsertElement,
    type DeleteAttribute,
    type UpdateAttributeValue,
    type ReplaceAttribute,
    type ReplaceElement,
    type ReplaceText,
    type ReplaceElementContent,
    type InsertAttribute,
    type MoveElements,
    INSERT_TARGET,
    DELETE_ELEMENT,
    INSERT_ELEMENT,
    INSERT_ATTRIBUTE,
    DELETE_ATTRIBUTE,
    UPDATE_ATTRIBUTE_VALUE
} from '../types';
import { ApiError, ApiErrorCode } from '../error';
import type { Document } from './document';

import { CDSWriter } from './writer';
import { getMissingRefs } from './references';
import { addAllVocabulariesToAliasInformation } from '../vocabularies';
import { getDocument, getGhostFileDocument } from './document';
import { convertPointer, getAstNodesFromPointer } from './pointer';
import { getGenericNodeFromPointer, pathFromUri, PRIMITIVE_TYPE_NAMES } from '../utils';
import {
    INSERT_PRIMITIVE_VALUE_TYPE,
    createDeleteQualifierChange,
    createInsertCollectionChange,
    createInsertEmbeddedAnnotationChange,
    createInsertPrimitiveValueChange,
    createInsertRecordChange,
    createInsertRecordPropertyChange,
    createInsertReferenceChange,
    createInsertTargetChange,
    createUpdatePrimitiveValueChange
} from './change';
import {
    DELETE_REFERENCE,
    MOVE_ELEMENT,
    REPLACE_ATTRIBUTE,
    REPLACE_ELEMENT,
    REPLACE_ELEMENT_CONTENT,
    REPLACE_TEXT,
    UPDATE_ELEMENT_NAME
} from '../types/internal-change';

type ChangeHandlerFunction<T extends AnnotationFileChange> = (writer: CDSWriter, document: Document, change: T) => void;
type ChangeHandler = {
    [Change in AnnotationFileChange as Change['type']]: ChangeHandlerFunction<Change>;
};

/**
 *
 */
export class CDSAnnotationServiceAdapter implements AnnotationServiceAdapter, ChangeHandler {
    public metadataService = new MetadataService();
    public splitAnnotationSupport = true;
    private fileCache: Map<string, string>;
    private documents = new Map<string, Document>();
    private metadata: MetadataElement[] = [];
    private missingReferences: { [uri: string]: Set<string> } = {};
    /**
     *
     * @param service - CDS service structure.
     * @param project - Project structure.
     * @param vocabularyService - Vocabulary API.
     * @param appName - Name of the application.
     */
    constructor(
        private service: CDSService,
        private project: Project,
        private vocabularyService: VocabularyService,
        private appName: string
    ) {
        this.fileCache = new Map();
        this._fileSequence = service.serviceFiles;
    }
    private facade: CdsCompilerFacade | undefined;
    private setFileCache(fileCache: Map<string, string>) {
        this.fileCache = fileCache;
    }

    private setFacade(facade: CdsCompilerFacade) {
        this.facade = facade;
    }

    private _compiledService: CompiledService | undefined;
    /**
     * @returns Compiled CDS service.
     */
    public get compiledService(): CompiledService {
        if (!this._compiledService) {
            this._compiledService = this._getCompiledService();
        }
        return this._compiledService;
    }

    private set compiledService(v: CompiledService) {
        this._compiledService = v;
    }

    private _fileSequence: TextFile[] | undefined;

    /**
     * Refreshes internal data structures from the provided project files.
     *
     * @param fileCache - File uri mapped to file content.
     * @returns Sync errors
     */
    public async sync(fileCache: Map<string, string>): Promise<Map<string, CompilerMessage>> {
        const paths = [...this.service.serviceFiles.map((file) => fileURLToPath(file.uri))];
        const facade = await createCdsCompilerFacadeForRoot(this.project.root, paths, fileCache);
        this.setFacade(facade);
        const compileErrors = facade.getCompilerErrors(this.project.root);
        const relevantErrors = [...compileErrors].filter(([file, compilerMessage]) => {
            return (
                compilerMessage.messages.filter((value) => value.severity === DiagnosticSeverity.Error).length &&
                !file.startsWith('../')
            );
        });
        if (relevantErrors.length > 0) {
            // if model has compiler errors
            for (const [relativePath, compilerMessage] of relevantErrors) {
                console.log(`Compile errors in: ${relativePath}`);
                for (const [fileUri, content] of fileCache) {
                    if (fileUri.endsWith(relativePath)) {
                        console.log(content);
                    }
                }
                console.log(JSON.stringify(compilerMessage, undefined, 2));
            }
            return compileErrors;
        }
        this.documents.clear();
        this.invalidateCaches();
        this.updateFileSequence(facade);
        this.setFileCache(fileCache);
        const metadataElementMap = facade.getMetadata(this.service.serviceName);
        // We collect already full metadata from compile model, we don't need to build it based on paths.
        const metadataCollector = createMetadataCollector(new Map(), facade);
        const { propagationMap, sourceUris } = facade.getPropagatedTargetMap(this.service.serviceName);
        for (const file of this.service.serviceFiles) {
            const document = getDocument(
                this.service.serviceName,
                this.vocabularyService,
                facade,
                fileCache,
                file,
                metadataCollector
            );
            this.documents.set(file.uri, document);
            // ghost files
            if (sourceUris.has(relative(this.project.root, fileURLToPath(file.uri)))) {
                const ghostDoc = getGhostFileDocument(
                    this.service.serviceName,
                    this.vocabularyService,
                    facade,
                    fileCache,
                    file,
                    metadataCollector,
                    propagationMap
                );
                this.documents.set(ghostDoc.annotationFile.uri, ghostDoc);
            }
        }
        const metadataElements = getMetadataElementsFromMap(metadataElementMap);
        this.metadataService = new MetadataService({ uriMap: facade?.getUriMap() || new Map() });
        this.metadataService.import(metadataElements, 'DummyMetadataFileUri');
        return new Map();
    }

    /**
     * Returns all relevant service files.
     *
     * @param includeGhostFiles - Flag indicating if ghost files should be included.
     * @returns All relevant service files.
     */
    public getAllFiles(includeGhostFiles: boolean): TextFile[] {
        if (includeGhostFiles) {
            const annotationFiles = [...this.compiledService.annotationFiles];
            annotationFiles.reverse();
            return annotationFiles.map((file) => ({
                uri: file.uri,
                isReadOnly:
                    // ghost files are readOnly and should not be in service files
                    this.service.serviceFiles.find((serviceFile) => serviceFile.uri === file.uri)?.isReadOnly ?? true
            }));
        }
        return [...this.service.serviceFiles];
    }

    /**
     * Creates empty annotation file content for the given service.
     *
     * @param serviceName - Name of the service.
     * @param uri - URI for the new annotation file.
     * @returns New annotation file content.
     */
    public getInitialFileContent(serviceName: string, uri: string): string {
        if (this.facade) {
            const fileName = this.facade.getFileName(serviceName) ?? '';
            let path = relative(dirname(uri), join(this.project.root, dirname(fileName))).replace(/\\/g, '/');
            path = join(path, basename(fileName, '.cds'));
            path = path.split(sep).join('/'); // always use '/' instead of platform specific separator
            return `using ${serviceName} as service from '${path}';\n`;
        }
        return '';
    }

    /**
     * Converts changes to workspace edits.
     *
     * @param changes - Internal changes.
     * @returns Workspace edits.
     */
    public async getWorkspaceEdit(changes: AnnotationFileChange[]): Promise<WorkspaceEdit> {
        const workspaceChanges: { [uri: string]: TextEdit[] } = {};
        this.clearState();
        const writers = new Map<string, CDSWriter>();
        for (const change of changes) {
            let writer = writers.get(change.uri);
            const document = this.documents.get(change.uri);
            const cachedFile = this.fileCache?.get(change.uri);
            if (!document || cachedFile === undefined || !this.facade) {
                continue;
            }
            if (!writer) {
                //writable cds document (augment)
                const textDocument = TextDocument.create(change.uri, 'cds', 0, cachedFile);
                writer = new CDSWriter(
                    this.facade,
                    this.vocabularyService,
                    document.ast,
                    document.comments,
                    document.tokens,
                    textDocument,
                    this.project.root,
                    document.annotationFile
                );
                writers.set(change.uri, writer);
            }
            const changeHandler = this[change.type] as unknown as ChangeHandlerFunction<AnnotationFileChange>;

            changeHandler(writer, document, change);
        }
        for (const [uri, writer] of writers.entries()) {
            const document = this.documents.get(uri);
            if (!document) {
                continue;
            }
            this.processMissingReferences(uri, writer);
            const edits = await writer.getTextEdits();
            workspaceChanges[uri] = edits;
        }
        return {
            changes: workspaceChanges
        };
    }

    /**
     * Checks if there are no compile errors in the files after update.
     *
     * @param fileCache - Updated file content.
     * @returns Errors.
     */
    public async validateChanges(fileCache: Map<string, string>): Promise<Map<string, CompilerMessage>> {
        return this.sync(fileCache);
    }

    /**
     * Converts annotation object to a string.
     *
     * @param target - Content of an 'Annotations' element.
     * @returns CDS representation of the annotations.
     */
    public serializeTarget(target: Target): string {
        return printTarget(target);
    }

    private _getCompiledService(): CompiledService {
        const annotationFiles: AnnotationFile[] = [];
        for (const file of this._fileSequence ?? []) {
            const document = this.documents.get(file.uri);
            const ghostDocument = this.documents.get('!' + file.uri);
            if (ghostDocument) {
                annotationFiles.push(ghostDocument.annotationFile);
            }
            if (document) {
                annotationFiles.push(document.annotationFile);
            } else {
                throw new ApiError(`Could not compile service. Missing document ${file.uri}`, ApiErrorCode.General);
            }
        }
        annotationFiles.reverse();
        return Object.freeze({
            odataVersion: '4.0',
            annotationFiles,
            metadata: this.metadata
        });
    }

    private clearState() {
        this.missingReferences = {};
    }

    private invalidateCaches(): void {
        this._compiledService = undefined;
        this._fileSequence = undefined;
    }

    private updateFileSequence(facade: CdsCompilerFacade): void {
        this._fileSequence = facade.getFileSequence().map((uri) => ({
            uri: pathToFileURL(uri).toString(),
            isReadOnly: uri.indexOf('node_modules') !== -1
        }));
        this.service.serviceFiles = [...this._fileSequence];
    }

    private processMissingReferences(uri: string, writer: CDSWriter): void {
        const missingReferences = this.missingReferences[uri];
        if (missingReferences?.size) {
            const pointer = '/references';
            const normalizedReferences = [...missingReferences].map((reference) => {
                if (reference.startsWith('file://')) {
                    // uri => convert to relative path to root
                    const path = pathFromUri(reference);
                    return relative(this.project.root, path);
                } else {
                    return reference;
                }
            });
            writer.addChange(createInsertReferenceChange(pointer, normalizedReferences));
        }
    }

    private addMissingReferences(uri: string, references: Set<string>) {
        const missingReferences = (this.missingReferences[uri] ??= new Set());
        for (const reference of references) {
            missingReferences.add(reference);
        }
    }
    [INSERT_TARGET] = (writer: CDSWriter, document: Document, change: InsertTarget): void => {
        const aliasInfo = getAliasInfo(document.annotationFile, this.metadataService, this.vocabularyService);
        const missingReferences = getMissingRefs(
            this.documents,
            change.uri,
            change.target.name,
            change.target,
            aliasInfo,
            this.metadataService,
            {
                apps: Object.keys(this.project.apps),
                projectRoot: this.project.root,
                appName: this.appName
            }
        );
        this.addMissingReferences(document.uri, missingReferences);
        // This has to happen after getting refs, because currently it depends on OData path syntax

        const targetName = change.target.name;
        const pathSegments = targetName.split('/');
        const pathBase = pathSegments.shift() ?? '';
        const parsedName = parseIdentifier(pathBase);
        const fullyQualifiedPath =
            toFullyQualifiedName(aliasInfo.aliasMap, aliasInfo.currentFileNamespace, parsedName) ?? '';
        const metadataElement = this.metadataService.getMetadataElement(fullyQualifiedPath);
        let originalPathBase = metadataElement?.originalName ?? pathBase;
        if (parsedName.namespaceOrAlias !== undefined) {
            const namespace = aliasInfo.aliasMap[parsedName.namespaceOrAlias];
            if (namespace) {
                originalPathBase = originalPathBase.replace(namespace, parsedName.namespaceOrAlias);
            }
        }
        change.target.name = [originalPathBase, ...pathSegments].join('/');
        writer.addChange(createInsertTargetChange('target', change.target));
    };

    [DELETE_ELEMENT] = (writer: CDSWriter, document: Document, change: DeleteElement): void => {
        const { pointer } = convertPointer(document.annotationFile, change.pointer, document.ast);
        const [currentAstNode, parentAstNode] = getAstNodesFromPointer(document.ast, pointer).reverse();
        if (currentAstNode?.type === RECORD_PROPERTY_TYPE) {
            writer.addChange({
                type: 'delete-record-property',
                pointer: pointer
            });
        } else if (currentAstNode?.type === ANNOTATION_TYPE && parentAstNode.type === RECORD_TYPE) {
            // embedded annotation
            writer.addChange({
                type: 'delete-embedded-annotation',
                pointer: pointer
            });
        } else if (currentAstNode.type === TARGET_TYPE) {
            writer.addChange({
                type: 'delete-target',
                pointer: pointer
            });
        } else if (
            (currentAstNode?.type === ANNOTATION_TYPE && parentAstNode.type === TARGET_TYPE) ||
            (currentAstNode?.type === ANNOTATION_TYPE && parentAstNode.type === ANNOTATION_GROUP_ITEMS_TYPE)
        ) {
            writer.addChange({
                type: 'delete-annotation',
                pointer: pointer,
                target: change.target
            });
        } else if (currentAstNode?.type === RECORD_TYPE) {
            writer.addChange({
                type: 'delete-record',
                pointer: pointer
            });
        } else if (
            currentAstNode.type === 'boolean' ||
            currentAstNode.type === 'string' ||
            currentAstNode.type === 'path' ||
            currentAstNode.type === 'enum' ||
            currentAstNode.type === 'token' ||
            currentAstNode.type === 'number'
        ) {
            writer.addChange({
                type: 'delete-primitive-value',
                pointer: pointer
            });
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer} `,
                ApiErrorCode.General
            );
        }
    };

    [INSERT_ELEMENT] = (writer: CDSWriter, document: Document, change: InsertElement): void => {
        const { pointer, containsFlattenedNodes } = convertPointer(
            document.annotationFile,
            change.pointer,
            document.ast
        );
        const [currentAstNode] = getAstNodesFromPointer(document.ast, pointer).slice(-1);
        if (containsFlattenedNodes) {
            this.insertInFlattenedStructure(writer, document, change, pointer);
        } else if (currentAstNode.type === TARGET_TYPE) {
            writer.addChange({
                type: 'insert-annotation',
                pointer: pointer,
                element: change.element
            });
        } else if (currentAstNode.type === ANNOTATION_TYPE) {
            this.insertAnnotation(writer, change, pointer);
        } else if (currentAstNode.type === RECORD_TYPE) {
            this.insertRecord(writer, change, pointer, currentAstNode);
        } else if (currentAstNode.type === RECORD_PROPERTY_TYPE) {
            if (PRIMITIVE_TYPE_NAMES.includes(change.element.name)) {
                writer.addChange({
                    type: INSERT_PRIMITIVE_VALUE_TYPE,
                    pointer: pointer, // point to properties
                    element: change.element,
                    index: change.index
                });
            }
        } else if (currentAstNode.type === COLLECTION_TYPE) {
            if (change.element.name === Edm.Record) {
                writer.addChange({
                    type: 'insert-record',
                    pointer: pointer,
                    element: change.element,
                    index: change.index
                });
            } else if (PRIMITIVE_TYPE_NAMES.includes(change.element.name)) {
                writer.addChange({
                    type: INSERT_PRIMITIVE_VALUE_TYPE,
                    pointer: pointer,
                    element: change.element,
                    index: change.index
                });
            }
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer} ${change.element.name}`,
                ApiErrorCode.General
            );
        }
        const aliasInfo = getAliasInfo(document.annotationFile, this.metadataService, this.vocabularyService);
        const missingReferences = getMissingRefs(
            this.documents,
            change.uri,
            change.target,
            change.element,
            aliasInfo,
            this.metadataService,
            { apps: Object.keys(this.project.apps), projectRoot: this.project.root, appName: '' }
        );

        this.addMissingReferences(document.uri, missingReferences);
    };

    private insertInFlattenedStructure(
        writer: CDSWriter,
        document: Document,
        change: InsertElement,
        pointer: string
    ): void {
        const targetPointer = pointer.split('/').slice(0, 3).join('/');
        const termPointer = change.pointer.split('/').slice(0, 5).join('/');
        const annotationValuePointer = change.pointer.split('/').slice(5).join('/');
        const element = getGenericNodeFromPointer(document.annotationFile, termPointer);
        if (element?.type === ELEMENT_TYPE) {
            const annotation = buildAnnotation(element, annotationValuePointer, change.element);
            if (annotation) {
                writer.addChange({
                    type: 'insert-annotation',
                    element: annotation,
                    pointer: targetPointer
                });
            }
        }
    }

    private insertAnnotation(writer: CDSWriter, change: InsertElement, pointer: string): void {
        // insert annotation value
        if (change.element.name === Edm.Annotation) {
            writer.addChange(createInsertEmbeddedAnnotationChange(pointer, change.element));
        } else if (change.element.name === Edm.Collection) {
            writer.addChange(createInsertCollectionChange(pointer, change.element));
        } else if (change.element.name === Edm.Record) {
            writer.addChange(createInsertRecordChange(pointer, change.element));
        } else if (PRIMITIVE_TYPE_NAMES.includes(change.element.name)) {
            writer.addChange(createInsertPrimitiveValueChange(pointer, change.element));
        }
    }

    private insertRecord(writer: CDSWriter, change: InsertElement, pointer: string, record: Record): void {
        if (change.element.name === Edm.PropertyValue) {
            const index = adaptRecordPropertyIndex(record, change.index);
            const modifiedPointer = [...pointer.split('/'), 'properties'].join('/'); // pointer is record
            writer.addChange(createInsertRecordPropertyChange(modifiedPointer, change.element, index));
        } else if (change.element.name === Edm.Annotation) {
            const index = adaptRecordPropertyIndex(record, change.index);
            writer.addChange(createInsertEmbeddedAnnotationChange(pointer, change.element, index));
        } else if (change.element.name === Edm.Record) {
            const segment = pointer.split('/');
            const changeIndex = parseInt(segment.pop() ?? '', 10);
            const modifiedPointer = segment.join('/'); //point to annotations
            writer.addChange(createInsertRecordChange(modifiedPointer, change.element, changeIndex));
        }
    }
    [INSERT_ATTRIBUTE] = (writer: CDSWriter, document: Document, change: InsertAttribute): void => {
        const { pointer } = convertPointer(document.annotationFile, change.pointer, document.ast);
        const [currentAstNode] = getAstNodesFromPointer(document.ast, pointer).slice(-1);
        if (pointer) {
            if (currentAstNode.type === ANNOTATION_TYPE && change.name === Edm.Qualifier) {
                writer.addChange({
                    type: 'insert-qualifier',
                    pointer: pointer,
                    value: change.value
                });
            }
            if (
                currentAstNode.type === RECORD_PROPERTY_TYPE ||
                (currentAstNode.type === ANNOTATION_TYPE && change.name !== Edm.Qualifier)
            ) {
                writer.addChange({
                    type: 'insert-primitive-value',
                    pointer: pointer,
                    element: createElementNode({
                        name: change.name,
                        content: [createTextNode(change.value)]
                    })
                });
            }
            if (currentAstNode.type === RECORD_TYPE && change.name === Edm.Type) {
                writer.addChange({
                    type: 'insert-record-property',
                    pointer: pointer + '/properties',
                    index: 0,
                    element: createElementNode({
                        name: 'PropertyValue',
                        attributes: {
                            Property: createAttributeNode('Property', '$Type')
                        },
                        content: [createElementNode({ name: 'String', content: [createTextNode(change.value)] })]
                    })
                });
            }
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer} ${change.name}`,
                ApiErrorCode.General
            );
        }
    };
    [DELETE_ATTRIBUTE] = (writer: CDSWriter, document: Document, change: DeleteAttribute): void => {
        const { pointer } = convertPointer(document.annotationFile, change.pointer, document.ast);
        const [node] = getAstNodesFromPointer(document.ast, pointer).slice(-1);
        if (pointer && node?.type === QUALIFIER_TYPE) {
            writer.addChange(createDeleteQualifierChange(pointer));
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer}`,
                ApiErrorCode.General
            );
        }
    };
    [UPDATE_ATTRIBUTE_VALUE] = (writer: CDSWriter, document: Document, change: UpdateAttributeValue): void => {
        const { pointer } = convertPointer(document.annotationFile, change.pointer, document.ast);
        if (pointer) {
            writer.addChange(createUpdatePrimitiveValueChange(pointer, change.newValue));
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer} ${change.newValue}`,
                ApiErrorCode.General
            );
        }
    };
    [REPLACE_ATTRIBUTE] = (writer: CDSWriter, document: Document, change: ReplaceAttribute): void => {
        const { pointer } = convertPointer(document.annotationFile, change.pointer, document.ast);
        const [currentAstNode] = getAstNodesFromPointer(document.ast, pointer).slice(-1);
        if (pointer) {
            if (currentAstNode.type === RECORD_PROPERTY_TYPE && change.newAttributeValue) {
                writer.addChange({
                    type: 'update-primitive-value',
                    pointer: pointer,
                    newValue: change.newAttributeValue
                });
            }
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer}`,
                ApiErrorCode.General
            );
        }
    };
    [REPLACE_ELEMENT] = (writer: CDSWriter, document: Document, change: ReplaceElement): void => {
        const { pointer } = convertPointer(document.annotationFile, change.pointer, document.ast);
        const currentAFNode = getGenericNodeFromPointer(document.annotationFile, change.pointer);
        if (pointer) {
            if (currentAFNode?.type === ELEMENT_TYPE && currentAFNode.name === Edm.PropertyValue) {
                writer.addChange({
                    type: 'replace-record-property',
                    pointer: pointer,
                    newProperty: change.newElement
                });
            } else {
                writer.addChange({
                    type: 'replace-node',
                    pointer: pointer,
                    newElement: change.newElement
                });
            }
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer} ${change.newElement.name}`,
                ApiErrorCode.General
            );
        }
    };
    [REPLACE_TEXT] = (writer: CDSWriter, document: Document, change: ReplaceText): void => {
        const { pointer } = convertPointer(document.annotationFile, change.pointer, document.ast);
        const segments = change.pointer.split('/');
        const lastSegment = segments.pop();
        const annotationFileNode = getGenericNodeFromPointer(document.annotationFile, segments.join('/'));
        if (pointer) {
            if (lastSegment === 'text' && elementHasFlags(annotationFileNode)) {
                // CDS has specific syntax for flags and
                writer.addChange({
                    type: 'set-flags',
                    pointer: pointer,
                    value: change.text.text
                });
            } else {
                writer?.addChange({
                    type: 'replace-text-value',
                    pointer: pointer,
                    newValue: change.text.text
                });
            }
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer} ${change.text}`,
                ApiErrorCode.General
            );
        }
    };
    [REPLACE_ELEMENT_CONTENT] = (writer: CDSWriter, document: Document, change: ReplaceElementContent): void => {
        const { pointer } = convertPointer(document.annotationFile, change.pointer, document.ast);
        const [currentAstNode] = getAstNodesFromPointer(document.ast, pointer).slice(-1);
        const annotationFileNode = getGenericNodeFromPointer(document.annotationFile, change.pointer);
        const newValue = change.newValue[0];
        if (pointer && currentAstNode && newValue?.type === TEXT_TYPE) {
            if (annotationFileNode?.type === ELEMENT_TYPE && annotationFileNode.name === Edm.EnumMember) {
                if (elementHasFlags(annotationFileNode)) {
                    writer.addChange({
                        type: 'set-flags',
                        pointer: pointer,
                        value: newValue.text
                    });
                } else {
                    writer.addChange({
                        type: 'replace-text-value',
                        pointer: pointer,
                        newValue: newValue.text
                    });
                }
            } else {
                writer.addChange({
                    type: 'update-primitive-value',
                    pointer: pointer,
                    newValue: newValue.text
                });
            }
        } else {
            throw new ApiError(
                `Could not process change ${change.type} ${change.uri} ${change.pointer} ${change.newValue}`,
                ApiErrorCode.General
            );
        }
    };
    [MOVE_ELEMENT] = (writer: CDSWriter, document: Document, change: MoveElements): void => {
        const { pointer, index } = change;
        const { pointer: toPointer } = convertPointer(document.annotationFile, pointer, document.ast);
        const toNode = getGenericNodeFromPointer(document.annotationFile, pointer);
        if (toPointer && isElementWithName(toNode, 'Collection')) {
            writer.addChange({
                type: 'move-collection-value',
                pointer: toPointer,
                index,
                fromPointers: change.fromPointers.map((ptr) => {
                    const { pointer } = convertPointer(document.annotationFile, ptr, document.ast);
                    return pointer;
                })
            });
        }
    };
    [UPDATE_ELEMENT_NAME] = (): void => {
        // noop, such changes have no effect in CDS
    };
    [DELETE_REFERENCE] = (): void => {
        // noop, such changes are not supported in CDS
    };
}

function getAliasInfo(
    annotationFileInternal: AnnotationFile,
    metadataService: MetadataService,
    vocabularyAPI: VocabularyService
): AliasInformation {
    const namespaces = getAllNamespacesAndReferences(
        annotationFileInternal.namespace,
        annotationFileInternal.references
    );
    const aliasInfo = getAliasInformation(namespaces, metadataService.getNamespaces());
    return addAllVocabulariesToAliasInformation(aliasInfo, vocabularyAPI.getVocabularies());
}

function elementHasFlags(element: AnyNode | undefined): boolean {
    if (!element || element.type !== 'element') {
        return false;
    }
    const content = element.content[0];
    if (content?.type === 'text' && element.name === Edm.EnumMember) {
        return content.text.split(' ').length > 1;
    }
    return false;
}

function buildAnnotation(root: AnyNode, pointer: string, lastContent: Element): Element | undefined {
    const segments = pointer.split('/');

    let node: AnyNode = root;
    if (node.type !== ELEMENT_TYPE) {
        return undefined;
    }
    const result = buildElement(node);
    let current: Element = result;
    for (const segment of segments) {
        const next: AnyNode | undefined = (node as unknown as { [key: string]: Element })[segment];
        if (next) {
            node = next;
            if (node.type === ELEMENT_TYPE) {
                const nextElement = buildElement(node);
                current.content.push(nextElement);
                current = nextElement;
            } else if (!Array.isArray(node)) {
                return undefined;
            }
        } else {
            return undefined;
        }
    }
    current.content.push(lastContent);
    return result;
}

function buildElement(node: Element): Element {
    const result = createElementNode({ name: node.name });
    if (node.name === Edm.Annotation) {
        result.attributes[Edm.Term] = node.attributes[Edm.Term];
        if (node.attributes[Edm.Qualifier]) {
            result.attributes[Edm.Qualifier] = node.attributes[Edm.Qualifier];
        }
    }
    if (node.name === Edm.PropertyValue) {
        result.attributes[Edm.Property] = node.attributes[Edm.Property];
    }
    return result;
}

function adaptRecordPropertyIndex(record: Record, currentIndex?: number): number | undefined {
    if (currentIndex === undefined) {
        return currentIndex;
    }

    let adaptedIdx = currentIndex;

    for (let index = 0; index < record.properties.length; index++) {
        const propertyName = record.properties[index].name.value;
        if (isReservedProperty(propertyName) && index <= adaptedIdx) {
            adaptedIdx = adaptedIdx + 1;
        }
    }
    return adaptedIdx;
}
