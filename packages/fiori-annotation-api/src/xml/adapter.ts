import type { XMLDocument, XMLElement } from '@xml-tools/ast';
import { buildAst } from '@xml-tools/ast';
import { parse } from '@xml-tools/parser';
import type { DocumentCstNode } from '@xml-tools/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
    convertDocument,
    convertMetadataDocument,
    getNewAnnotationFile,
    serializeTarget
} from '@sap-ux/xml-odata-annotation-converter';
import type {
    AnnotationFile,
    AnyNode,
    Element,
    ElementChild,
    Reference,
    Target,
    TextEdit,
    WorkspaceEdit,
    MetadataElement,
    AliasInformation
} from '@sap-ux/odata-annotation-core-types';
import {
    ATTRIBUTE_TYPE,
    ELEMENT_TYPE,
    createAttributeNode,
    createElementNode,
    Edm,
    Edmx,
    createReference
} from '@sap-ux/odata-annotation-core-types';
import { getAliasInformation, getAllNamespacesAndReferences } from '@sap-ux/odata-annotation-core';

import type { Project } from '@sap-ux/project-access';
import type { VocabularyService } from '@sap-ux/odata-vocabularies';
import { MetadataService } from '@sap-ux/odata-entity-model';

import {
    type LocalEDMXService,
    type CompiledService,
    type TextFile,
    type AnnotationServiceAdapter,
    type AnnotationFileChange,
    INSERT_ELEMENT,
    UPDATE_ATTRIBUTE_VALUE,
    DELETE_ELEMENT,
    MOVE_ELEMENT,
    INSERT_ATTRIBUTE,
    REPLACE_ELEMENT,
    REPLACE_ATTRIBUTE,
    DELETE_ATTRIBUTE,
    INSERT_TARGET,
    REPLACE_TEXT
} from '../types';
import { ApiError, ApiErrorCode } from '../error';

import { XMLWriter } from './writer';
import { REPLACE_ELEMENT_CONTENT } from './changes';
import type { Document } from './document';
import type { Comment } from './comments';
import { collectUsedNamespaces } from './references';
import { collectComments } from './comments';
import { getNodeFromPointer } from './pointer';

/**
 *
 */
export class XMLAnnotationServiceAdapter implements AnnotationServiceAdapter {
    public metadataService = new MetadataService();
    public splitAnnotationSupport = false;
    public fileCache: Map<string, string>;

    private documents = new Map<string, Document>();
    private metadata: MetadataElement[] = [];

    private setFileCache(fileCache: Map<string, string>) {
        this.fileCache = fileCache;
    }

    private _compiledService: CompiledService | undefined;
    /**
     *
     * @returns Compiled XML service.
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

    /**
     *
     * @param service - Service structure.
     * @param vocabularyService - Vocabulary API.
     * @param project - Project structure.
     * @param appName - Name of the application.
     */
    constructor(
        private service: LocalEDMXService,
        private vocabularyService: VocabularyService,
        private project: Project,
        private appName: string
    ) {
        this.fileCache = new Map();
    }

    /**
     * Refreshes internal data structures from the provided project files.
     *
     * @param fileCache - File uri mapped to file content.
     */
    public sync(fileCache: Map<string, string>): void {
        this.documents.clear();
        this._compiledService = undefined;
        this.setFileCache(fileCache);
        const { ast: metadataDocument, comments: metadataComments } = parseFile(fileCache, this.service.metadataFile);
        this.documents.set(this.service.metadataFile.uri, {
            uri: this.service.metadataFile.uri,
            comments: metadataComments,
            ast: metadataDocument,
            annotationFile: convertDocument(this.service.metadataFile.uri, metadataDocument),
            usedNamespaces: new Set()
        });

        for (const file of this.service.annotationFiles) {
            const { ast, comments } = parseFile(fileCache, file, false);
            const annotationFile = convertDocument(file.uri, ast);
            const usedNamespaces = new Set<string>();
            collectUsedNamespaces(annotationFile, usedNamespaces);
            this.documents.set(file.uri, {
                uri: file.uri,
                comments,
                ast,
                annotationFile,
                usedNamespaces
            });
        }
        this.metadata = convertMetadataDocument(this.service.metadataFile.uri, metadataDocument);
        this.metadataService = new MetadataService({
            ODataVersion: this.service.odataVersion,
            isCds: false
        });
        this.metadataService.import(this.metadata, this.service.metadataFile.uri);
    }

    /**
     * Returns all relevant service files.
     *
     * @returns All relevant service files.
     */
    public getAllFiles(): TextFile[] {
        return [this.service.metadataFile, ...this.service.annotationFiles];
    }

    /**
     * Creates empty annotation file content for the given service.
     *
     * @param serviceName - Name of the service.
     * @param uri - URI for the new annotation file.
     * @returns New annotation file content.
     */
    public getInitialFileContent(serviceName: string, uri: string): string {
        const appName = this.appName || Object.keys(this.project.apps)[0];
        const metadataURI = `${this.project.apps[appName].services[serviceName].uri}$metadata`;
        const metadataNamespace = [...this.metadataService.getNamespaces()][0];
        const aliasInfo = getAliasInfo(
            {
                references: [
                    {
                        name: metadataNamespace,
                        uri: metadataURI,
                        type: 'reference',
                        alias: 'Metadata'
                    }
                ],
                targets: [],
                type: 'annotation-file',
                uri,
                namespace: {
                    name: this.getUniqueNamespace(metadataNamespace),
                    type: 'namespace'
                }
            },
            this.metadataService
        );
        const vocabularies = this.vocabularyService.getVocabularies();
        return getNewAnnotationFile(aliasInfo, metadataURI, vocabularies).fileContent;
    }

    /**
     * Converts changes to workspace edits.
     *
     * @param changes - Internal changes.
     * @returns Workspace edits.
     */
    public async getWorkspaceEdit(changes: AnnotationFileChange[]): Promise<WorkspaceEdit> {
        const workspaceChanges: { [uri: string]: TextEdit[] } = {};
        const writers = new Map<string, XMLWriter>();
        const targetChildReferencesByUri: Record<string, Map<string, Set<string>>> = {};
        for (const change of changes) {
            let writer = writers.get(change.uri);
            const document = this.documents.get(change.uri);
            const targetChildReferences = (targetChildReferencesByUri[change.uri] ??= new Map());
            if (!document) {
                continue;
            }
            if (!writer) {
                const textDocument = TextDocument.create(change.uri, 'cds', 0, this.fileCache?.get(change.uri) ?? '');
                writer = new XMLWriter(document.ast, document.comments, textDocument);
                writers.set(change.uri, writer);
            }
            this.processChange(document, writer, targetChildReferences, change);
        }
        for (const [uri, writer] of writers.entries()) {
            const targetChildReferences = (targetChildReferencesByUri[uri] ??= new Map());
            for (const [targetPointer, childPointers] of targetChildReferences.entries()) {
                if (childPointers.size === 0) {
                    writer.addChange({
                        type: 'delete-element',
                        pointer: targetPointer
                    });
                }
            }
            let edits = writer.getTextEdits();
            const newEdits = this.postprocessEdits(uri, writer, edits);
            if (newEdits.length) {
                edits = newEdits;
            }
            workspaceChanges[uri] = edits;
        }
        return Promise.resolve({ changes: workspaceChanges });
    }

    /**
     * No checking is done for XML files.
     *
     * @param fileCache - Updated file content.
     * @returns Nothing.
     */
    public validateChanges(fileCache: Map<string, string>): void {
        return this.sync(fileCache);
    }

    /**
     * Converts annotation object to a string.
     *
     * @param target - Content of an 'Annotations' element.
     * @returns XML representation of the annotations.
     */
    public serializeTarget(target: Target): string {
        return serializeTarget(target);
    }

    private getUniqueNamespace(metadataNamespace: string): string {
        const namespaces = new Set<string>();
        this.documents.forEach((document) => {
            const namespace = document.annotationFile.namespace;
            if (namespace) {
                namespaces.add(namespace.name);
            }
        });
        let newNamespace = `${metadataNamespace}.annotations`;
        let index = 0;
        while ([...namespaces].includes(newNamespace)) {
            ++index;
            newNamespace = `${newNamespace}${index}`;
            if (![...namespaces].includes(newNamespace)) {
                break;
            }
        }
        return newNamespace;
    }

    private _getCompiledService(): CompiledService {
        const files = [this.service.metadataFile, ...this.service.annotationFiles];
        const annotationFiles: AnnotationFile[] = [];
        for (const file of files) {
            const document = this.documents.get(file.uri);
            if (document) {
                annotationFiles.push(document.annotationFile);
            } else {
                throw new ApiError(`Could not compile service. Missing document ${file.uri}`, ApiErrorCode.General);
            }
        }
        return Object.freeze({
            odataVersion: this.service.odataVersion,
            annotationFiles,
            metadata: this.metadata
        });
    }

    private processChange(
        document: Document,
        writer: XMLWriter,
        targetChildReferences: Map<string, Set<string>>,
        change: AnnotationFileChange
    ): void {
        switch (change.type) {
            case INSERT_TARGET: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(!pointer, `Could not process change ${change.type} ${change.uri} ${change.target}`);
                const element = createElementNode({
                    name: 'Annotations',
                    attributes: {
                        Target: createAttributeNode('Target', change.target.name)
                    },
                    content: change.target.terms
                });
                writer.addChange({
                    type: INSERT_ELEMENT,
                    pointer: pointer!,
                    element
                });
                break;
            }
            case INSERT_ELEMENT: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(
                    !pointer,
                    `Could not process change ${change.type} ${change.uri} ${change.pointer} ${change.element.name}`
                );
                const fullPointer = pointer + convertPointer(document.annotationFile, change.pointer);
                const element = getNodeFromPointer(document.ast, fullPointer);
                if (element?.type === 'XMLElement' && element.name === Edm.Annotations) {
                    this.markElementInsertion(targetChildReferences, fullPointer, element);
                }
                writer.addChange({
                    type: INSERT_ELEMENT,
                    pointer: pointer + convertPointer(document.annotationFile, change.pointer),
                    element: change.element,
                    index: change.index
                });
                break;
            }
            case DELETE_ELEMENT: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(!pointer, `Could not process change ${change.type} ${change.uri} ${change.pointer} `);
                const fullPointer = pointer + convertPointer(document.annotationFile, change.pointer);
                const element = getNodeFromPointer(document.ast, fullPointer);
                if (
                    element?.type === 'XMLElement' &&
                    element.name === Edm.Annotation &&
                    element.parent?.type === 'XMLElement' &&
                    element.parent.name === Edm.Annotations
                ) {
                    this.markElementDeletion(targetChildReferences, fullPointer, element.parent);
                }
                writer.addChange({
                    type: 'delete-element',
                    pointer: fullPointer
                });
                break;
            }
            case DELETE_ATTRIBUTE: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(!pointer, `Could not process change ${change.type} ${change.uri} ${change.pointer} `);
                writer.addChange({
                    type: 'delete-attribute',
                    pointer: pointer + convertPointer(document.annotationFile, change.pointer)
                });
                break;
            }
            case UPDATE_ATTRIBUTE_VALUE: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(!pointer, `Could not process change ${change.type} ${change.uri} ${change.pointer} `);
                writer.addChange({
                    type: UPDATE_ATTRIBUTE_VALUE,
                    pointer: pointer + convertPointer(document.annotationFile, change.pointer),
                    newValue: change.newValue
                });
                break;
            }
            case REPLACE_ATTRIBUTE: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(!pointer, `Could not process change ${change.type} ${change.uri} ${change.pointer} `);
                writer.addChange({
                    type: 'update-attribute-name',
                    pointer: pointer + convertPointer(document.annotationFile, change.pointer),
                    newName: change.newAttributeName
                });
                writer.addChange({
                    type: UPDATE_ATTRIBUTE_VALUE,
                    pointer: pointer + convertPointer(document.annotationFile, change.pointer),
                    newValue: change.newAttributeValue
                });
                break;
            }
            case REPLACE_ELEMENT: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(!pointer, `Could not process change ${change.type} ${change.uri} ${change.pointer} `);
                writer.addChange({
                    type: 'replace-element',
                    pointer: pointer + convertPointer(document.annotationFile, change.pointer),
                    newElement: change.newElement
                });
                break;
            }
            case REPLACE_ELEMENT_CONTENT: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(!pointer, `Could not process change ${change.type} ${change.uri} ${change.pointer} `);
                writer.addChange({
                    type: REPLACE_ELEMENT_CONTENT,
                    pointer: pointer + convertPointer(document.annotationFile, change.pointer),
                    newValue: change.newValue
                });
                break;
            }
            case INSERT_ATTRIBUTE: {
                const pointer = getSchemaPointer(document.ast);
                throwIf(
                    !pointer,
                    `Could not process change ${change.type} ${change.uri} ${change.pointer} ${change.name}`
                );
                writer.addChange({
                    type: 'insert-attribute',
                    pointer: pointer + convertPointer(document.annotationFile, change.pointer),
                    name: change.name,
                    value: change.value
                });
                break;
            }
            case MOVE_ELEMENT: {
                const schemaPointer = getSchemaPointer(document.ast);
                if (schemaPointer) {
                    const pointer = schemaPointer + convertPointer(document.annotationFile, change.pointer);
                    writer.addChange({
                        type: 'move-collection-value',
                        pointer,
                        index: change.index,
                        fromPointers: change.fromPointers.map(
                            (fromPointer) => schemaPointer + convertPointer(document.annotationFile, fromPointer)
                        )
                    });
                }
                break;
            }
            case REPLACE_TEXT:
                {
                    const schemaPointer = getSchemaPointer(document.ast);
                    if (schemaPointer) {
                        const pointer = schemaPointer + convertPointer(document.annotationFile, change.pointer);
                        writer.addChange({
                            type: REPLACE_ELEMENT_CONTENT,
                            // ends with textContents/<index>/text we need to get the parent element
                            pointer: pointer.split('/').slice(0, -3).join('/'),
                            newValue: [change.text]
                        });
                    }
                }
                break;
            default:
                break;
        }
    }

    private getTargetChildReferences(
        targetChildReferences: Map<string, Set<string>>,
        parentPointer: string,
        element: XMLElement
    ): Set<string> {
        const result = targetChildReferences.get(parentPointer);

        if (result) {
            return result;
        }

        const pointerSet = new Set<string>();
        for (let index = 0; index < element.subElements.length; index++) {
            const child = element.subElements[index];
            if (child.type === 'XMLElement') {
                pointerSet.add(`${parentPointer}/subElements/${index}`);
            }
        }
        targetChildReferences.set(parentPointer, pointerSet);
        return pointerSet;
    }

    private markElementDeletion(
        targetChildReferences: Map<string, Set<string>>,
        fullPointer: string,
        element: XMLElement
    ): void {
        const parentPointer = fullPointer.split('/').slice(0, -2).join('/');
        const annotationReferences = this.getTargetChildReferences(targetChildReferences, parentPointer, element);
        annotationReferences.delete(fullPointer);
    }

    private markElementInsertion(
        targetChildReferences: Map<string, Set<string>>,
        fullPointer: string,
        element: XMLElement
    ): void {
        const annotationReferences = this.getTargetChildReferences(targetChildReferences, fullPointer, element);
        annotationReferences.add(`${fullPointer}/subElements/-1`);
    }

    private postprocessEdits(uri: string, writer: XMLWriter, edits: TextEdit[]): TextEdit[] {
        const file = this.fileCache.get(uri);
        const document = this.documents.get(uri);
        if (!file || !document) {
            return [];
        }
        const newText = TextDocument.applyEdits(TextDocument.create(uri, '', 0, file), edits);
        const { cst, tokenVector } = parse(newText);
        const ast = buildAst(cst as DocumentCstNode, tokenVector);
        const referencesChanged = this.updateReferences(uri, writer, ast);
        if (referencesChanged) {
            return writer.getTextEdits();
        }

        return [];
    }

    private updateReferences(uri: string, writer: XMLWriter, ast: XMLDocument): boolean {
        const document = this.documents.get(uri);
        if (!document) {
            return false;
        }
        const annotationFile = convertDocument(uri, ast);
        const usedNames = new Set<string>();
        collectUsedNamespaces(annotationFile, usedNames);
        const allNamespaces = getAllNamespacesAndReferences(annotationFile.namespace, annotationFile.references);
        const aliasInfo = getAliasInformation(allNamespaces, this.metadataService.getNamespaces());
        const pointer = getEdmxPointer(document.ast);
        throwIf(!pointer, `No root EDMX element found in ${uri}`);
        const deletions = this.removeReferences(writer, document, aliasInfo, usedNames, pointer!);
        const inserts = this.addReferences(writer, document, aliasInfo, usedNames, pointer!);

        return deletions || inserts;
    }

    private removeReferences(
        writer: XMLWriter,
        document: Document,
        aliasInfo: AliasInformation,
        usedNames: Set<string>,
        pointer: string
    ): boolean {
        const toRemove = new Set<string>();
        for (const name of Object.keys(aliasInfo.aliasMapVocabulary)) {
            const namespace = aliasInfo.aliasMapVocabulary[name];
            const alias = aliasInfo.reverseAliasMap[namespace];

            if (!usedNames.has(namespace) && alias !== undefined && !usedNames.has(alias)) {
                toRemove.add(namespace);
            }
        }
        for (const namespace of toRemove) {
            for (let index = 0; index < document.ast.rootElement!.subElements.length; index++) {
                const reference = document.ast.rootElement!.subElements[index];
                const match = reference.subElements.find(
                    (child) =>
                        child.name === Edm.Include &&
                        child.attributes.find((attribute) => attribute.key === Edm.Namespace)?.value === namespace
                );
                if (match) {
                    writer.addChange({
                        type: DELETE_ELEMENT,
                        pointer: `${pointer}/subElements/${index}`
                    });
                }
            }
        }
        return toRemove.size > 0;
    }

    private addReferences(
        writer: XMLWriter,
        document: Document,
        aliasInfo: AliasInformation,
        usedNames: Set<string>,
        pointer: string
    ): boolean {
        const toAdd = new Set<string>();
        for (const name of usedNames) {
            if (!aliasInfo.aliasMapVocabulary[name]) {
                const namespace = this.vocabularyService.getVocabularyNamespace(name);
                if (namespace) {
                    toAdd.add(namespace);
                }
            }
        }
        for (const namespace of toAdd) {
            const vocabularyInfo = this.vocabularyService.getVocabulary(namespace);
            if (!vocabularyInfo) {
                continue;
            }
            const alias = vocabularyInfo.defaultAlias;
            const referenceUri = vocabularyInfo.defaultUri;
            const reference = createReference(namespace, alias, referenceUri);

            writer.addChange({
                type: INSERT_ELEMENT,
                pointer: pointer,
                element: createReferenceElement(reference),
                // insert at the start
                index: document.ast.rootElement!.subElements.length > 0 ? 0 : undefined
            });
        }
        return toAdd.size > 0;
    }
}

function throwIf(condition: boolean, message: string): void {
    if (condition) {
        throw new ApiError(message, ApiErrorCode.General);
    }
}

function createReferenceElement(reference: Reference): Element {
    const include = createElementNode({
        name: Edmx.Include,
        namespaceAlias: 'Edmx',
        attributes: {
            [Edmx.Namespace]: createAttributeNode(Edmx.Namespace, reference.name)
        }
    });
    if (reference.alias) {
        include.attributes[Edmx.Alias] = createAttributeNode(Edmx.Alias, reference.alias);
    }
    return createElementNode({
        name: Edmx.Reference,
        namespaceAlias: 'Edmx',
        content: [include],
        attributes: {
            [Edmx.Uri]: createAttributeNode(Edmx.Uri, reference.uri ?? '')
        }
    });
}

function getEdmxPointer(document: XMLDocument): string | undefined {
    if (!document.rootElement) {
        return undefined;
    }

    return `/rootElement`;
}

function getSchemaPointer(document: XMLDocument): string | undefined {
    if (!document.rootElement) {
        return undefined;
    }
    const dataServicesIndex = document.rootElement.subElements.findIndex(
        (element) => element.name === Edmx.DataServices
    );

    if (dataServicesIndex === -1) {
        return undefined;
    }
    const schemaIndex = document.rootElement.subElements[dataServicesIndex].subElements.findIndex(
        (element) => element.name === Edm.Schema
    );
    if (schemaIndex === -1) {
        return undefined;
    }
    return `/rootElement/subElements/${dataServicesIndex}/subElements/${schemaIndex}`;
}

function parseFile(
    fileCache: Map<string, string>,
    file: TextFile,
    ignoreComments = true
): { ast: XMLDocument; comments: Comment[] } {
    const content = fileCache.get(file.uri);
    if (typeof content !== 'string') {
        throw new Error(`File ${file.uri} not found in cache!`);
    }
    const { cst, tokenVector } = parse(content);
    const comments = ignoreComments ? [] : collectComments(tokenVector);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return { ast, comments };
}
type Node = AnyNode | ElementChild[];

function convertPointer(annotationFile: AnnotationFile, pointer: string): string {
    let currentNode: Node | undefined = annotationFile;
    return pointer
        .split('/')
        .map((segment, i, self) => {
            if (segment === 'content' || segment === 'targets' || segment === 'terms') {
                if (self[i + 2] === 'text') {
                    currentNode = (currentNode as unknown as { [key: string]: Node }).textContents;
                    return 'textContents';
                }
                if (currentNode) {
                    currentNode = (currentNode as unknown as { [key: string]: Node })[segment];
                }
                return 'subElements';
            }
            if (i !== 0 && currentNode) {
                const result = convertPointerSegment(segment, currentNode);
                currentNode = result.nextNode;
                return result.mappedSegment;
            }
            return segment;
        })
        .join('/');
}

function convertPointerSegment(
    segment: string,
    currentNode: Node
): { mappedSegment: string; nextNode: Node | undefined } {
    let elementIndex = -1;
    const index = Number.parseInt(segment, 10);
    const nextNode = (currentNode as unknown as { [key: string]: Node })[segment];
    if (Number.isSafeInteger(index) && Array.isArray(currentNode)) {
        // we need to adjust index to exclude text nodes
        for (let i = 0; i <= index && i < currentNode.length; i++) {
            const child = currentNode[i];
            if (child.type === ELEMENT_TYPE) {
                elementIndex++;
            }
        }
    } else if (!Array.isArray(nextNode) && nextNode?.type === ATTRIBUTE_TYPE) {
        // convert attribute segment to index based one
        // we assume that keys in the object are added in the order they are in file,
        // which in general should be true
        elementIndex = Object.keys(currentNode).findIndex((key) => key === segment);
    }
    const mappedSegment = elementIndex !== -1 ? elementIndex.toString() : segment;
    return { mappedSegment, nextNode };
}

function getAliasInfo(annotationFileInternal: AnnotationFile, metadataService: MetadataService): AliasInformation {
    const namespaces = getAllNamespacesAndReferences(
        annotationFileInternal.namespace,
        annotationFileInternal.references
    );
    return getAliasInformation(namespaces, metadataService.getNamespaces());
}
