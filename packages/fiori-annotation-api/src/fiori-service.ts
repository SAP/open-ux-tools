import { TextDocument } from 'vscode-languageserver-textdocument';

import { create as createStore } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create as createEditor } from 'mem-fs-editor';

import type { RawMetadata } from '@sap-ux/vocabularies-types';
import type { Project } from '@sap-ux/project-access';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import type {
    AliasInformation,
    CompilerMessage,
    Namespace,
    Reference,
    WorkspaceEdit
} from '@sap-ux/odata-annotation-core-types';
import { DiagnosticSeverity } from '@sap-ux/odata-annotation-core-types';

import { getAliasInformation, getAllNamespacesAndReferences } from '@sap-ux/odata-annotation-core';
import type { MetadataService } from '@sap-ux/odata-entity-model';

import type { AnnotationListWithOrigins } from './avt';
import { convertMetadataToAvtSchema, convertAnnotationFile, convertTargetAnnotationsToInternal } from './avt';

import { XMLAnnotationServiceAdapter, getLocalEDMXService } from './xml';
import { getCDSService, CDSAnnotationServiceAdapter } from './cds';
import { addAllVocabulariesToAliasInformation } from './vocabularies';

import type {
    AnnotationFileChange,
    CompiledService,
    AnnotationServiceAdapter,
    Service,
    Change,
    ProjectInfo,
    TextFile
} from './types';
import { ApiError, ApiErrorCode } from './error';
import { pathFromUri } from './utils';
import { ChangeConverter } from './change-converter';

export interface FioriAnnotationServiceConstructor<T> {
    new (
        vocabularyAPI: VocabularyService,
        adapter: AnnotationServiceAdapter,
        changeConverter: ChangeConverter,
        fs: Editor,
        options: FioriAnnotationServiceOptions,
        project: Project,
        serviceName: string,
        appName: string
    ): T;
}

export interface FioriAnnotationServiceOptions {
    commitOnSave: boolean;
    clearFileResolutionCache: boolean;
    /**
     * Only applicable for CAP CDS projects.
     * When set to true SAP annotations will be created instead of OData annotations.
     * Currently only supports "insert-annotation" changes for the following annotations:
     * - UI.LineItem
     * - UI.Facets
     * - UI.FieldGroup
     *
     * @experimental
     */
    writeSapAnnotations: boolean;
    /**
     * If set to true will assume that files specified in changes are empty.
     * If there is existing content, then it will be ignored.
     * Only "insert-annotation" changes are supported.
     * Does not support {@link FioriAnnotationService.save} multiple times.
     *
     * @experimental
     */
    ignoreChangedFileInitialContent: boolean;
}

function getOptionsWithDefaults(options: Partial<FioriAnnotationServiceOptions>): FioriAnnotationServiceOptions {
    return {
        commitOnSave: options.commitOnSave ?? true,
        clearFileResolutionCache: options.clearFileResolutionCache ?? false,
        writeSapAnnotations: options.writeSapAnnotations ?? false,
        ignoreChangedFileInitialContent: options.ignoreChangedFileInitialContent ?? false
    };
}

export const COMPILE_ERROR_MSG = 'Update rejected due to changes leading to compile errors';

/**
 * Service for working with OData annotations in SAP Fiori Elements applications.
 *
 */
export class FioriAnnotationService {
    protected changes: Change[] = [];
    protected fileMergeMaps: Record<string, Record<string, string>> = {};
    protected fileCache = new Map<string, string>();
    protected isInitialSyncCompleted = false;
    protected projectInfo: ProjectInfo = {
        appName: '',
        apps: [],
        projectRoot: ''
    };

    /**
     * For creating new instances use the factory function {@link FioriAnnotationService.createService}.
     *
     * @param vocabularyAPI - Vocabulary API instance.
     * @param adapter - Language specific adapter.
     * @param changeConverter ChangeConverter instance.
     * @param fs - `mem-fs-editor` instance.
     * @param options - API configuration.
     * @param project - Project structure.
     * @param serviceName - Name of the service.
     * @param appName - Name of the application
     */
    constructor(
        protected vocabularyAPI: VocabularyService,
        protected adapter: AnnotationServiceAdapter,
        protected changeConverter: ChangeConverter,
        protected fs: Editor,
        protected options: FioriAnnotationServiceOptions,
        project: Project,
        protected serviceName: string,
        appName: string
    ) {
        this.projectInfo = {
            apps: Object.keys(project.apps) || [],
            appName: appName || '',
            projectRoot: project.root
        };
    }

    /**
     * Creates new FioriAnnotationService instance for the given Fiori application.
     *
     * @param this - Constructor
     * @param project - Project structure.
     * @param serviceName - Name of the service used by the app.
     * @param appName - Name of the application.
     * @param fs - Optional `mem-fs-editor` instance.
     * @param options - API configuration.
     * @returns FioriAnnotationService instance.
     */
    public static async createService<T extends FioriAnnotationService>(
        this: FioriAnnotationServiceConstructor<T>,
        project: Project,
        serviceName: string,
        appName: string,
        fs?: Editor,
        options: Partial<FioriAnnotationServiceOptions> = {}
    ): Promise<T> {
        const vocabularyAPI = new VocabularyService(
            project.projectType === 'CAPJava' || project.projectType === 'CAPNodejs'
        );
        const finalOptions = getOptionsWithDefaults(options);
        const service = await getService(project, serviceName, appName, finalOptions.clearFileResolutionCache);
        const adapter = createAdapter(
            project,
            service,
            vocabularyAPI,
            appName,
            finalOptions.writeSapAnnotations,
            finalOptions.ignoreChangedFileInitialContent
        );

        // prepare fs editor if not provided
        let fsEditor: Editor;
        if (fs) {
            fsEditor = fs;
        } else {
            const store = createStore();
            fsEditor = createEditor(store);
        }
        const changeConverter = new ChangeConverter(
            serviceName,
            vocabularyAPI,
            adapter.metadataService,
            adapter.splitAnnotationSupport,
            finalOptions.ignoreChangedFileInitialContent
        );
        const fioriService = new this(
            vocabularyAPI,
            adapter,
            changeConverter,
            fsEditor,
            finalOptions,
            project,
            serviceName,
            appName
        );
        return fioriService;
    }

    /**
     * Returns a metadata service instance.
     *
     * @returns Metadata service instance.
     */
    public getMetadataService(): MetadataService {
        return this.adapter.metadataService;
    }

    /**
     * Returns a vocabulary service instance.
     *
     * @returns Vocabulary service instance.
     */
    public getVocabularyAPI(): VocabularyService {
        return this.vocabularyAPI;
    }

    /**
     * Returns a list of files which describe the service. The order is from least important to the most important file
     * Annotations defined in the last file would overwrite the ones defined in the previous ones.
     * You can only create changes for files which are not marked as `readOnly`.
     *
     * @param [includeGhostFiles] - If set to true will also include ghost files.
     * @returns Text files.
     */
    public getAllFiles(includeGhostFiles: boolean = false): TextFile[] {
        return this.adapter.getAllFiles(includeGhostFiles);
    }

    /**
     * Refreshes file content from the file system.
     */
    public async sync(): Promise<void> {
        this.fileCache.clear();
        const files = await Promise.all(
            this.adapter.getAllFiles().map(async (file) => {
                const path = pathFromUri(file.uri);
                const content = this.fs.read(path) ?? '';
                return { ...file, content };
            })
        );
        for (const file of files) {
            this.fileCache.set(file.uri, file.content);
        }
        await this.adapter.sync(this.fileCache);
        this.isInitialSyncCompleted = true;
    }

    /**
     * Provides initial annotation file content.
     *
     * @param filePath - Path to the newly created file.
     * @returns Annotation file content.
     */
    public getInitialFileContent(filePath: string): string {
        return this.adapter.getInitialFileContent?.(this.serviceName, filePath) ?? '';
    }

    /**
     * Reads annotations for a specific service in an application.
     *
     * @returns Service metadata in AVT format.
     */
    public getSchema(): RawMetadata {
        const rawMetadata: RawMetadata = {
            version: this.adapter.metadataService.ODataVersion,
            identification: 'metadataFile',
            schema: convertMetadataToAvtSchema(this.adapter.metadataService),
            references: []
        };

        this.fileMergeMaps = mergeAnnotations(
            this.adapter.compiledService,
            rawMetadata,
            this.serviceName,
            {
                vocabulary: this.vocabularyAPI
            },
            this.adapter.splitAnnotationSupport
        );
        return rawMetadata;
    }

    /**
     * Add change(s) to the stack.
     *
     * @param change - Pending changes.
     */
    public edit(change: Change | Change[]): void {
        if (Array.isArray(change)) {
            this.changes.push(...change);
        } else {
            this.changes.push(change);
        }
    }

    /**
     * Applies the collected changes to the file system.
     *
     * @param options Save options
     * @returns number of files changed.
     */
    public async save(options?: SaveOptions): Promise<{ files: number }> {
        if (!this.isInitialSyncCompleted) {
            await this.sync();
        }

        const newContent: Record<string, string> = {};
        const annotationFileChanges = this.convertChanges(this.changes);
        const workspaceEdit = await this.adapter.getWorkspaceEdit(annotationFileChanges);
        const changes = workspaceEdit.changes ?? {};
        const fileUris = Object.keys(changes);
        // copy the cache to temp to revert if changes caused cds compiler error
        const temp = new Map(this.fileCache);
        for (const fileUri of fileUris) {
            const path = pathFromUri(fileUri);
            const text = this.fs.read(path) ?? '';
            const newText = applyWorkspaceEdits(fileUri, '', workspaceEdit, text);
            this.fileCache.set(fileUri, newText);
            newContent[path] = newText;
        }

        this.changes = [];
        // Validate implicitly syncs, so we don't need to call it again
        if (typeof this.adapter.validateChanges === 'function') {
            const errors = await this.adapter.validateChanges(this.fileCache);
            if (errors?.size) {
                this.fileCache = new Map(temp);
                const messages = compilerMessagesToErrors(errors);
                throw new ApiError(COMPILE_ERROR_MSG, ApiErrorCode.CompileError, messages);
            } else {
                // if no compiler error persist the newly applied text edits
                for (const path of Object.keys(newContent)) {
                    const content = newContent[path];
                    this.saveFile(path, content);
                }
            }
        } else if (options?.resyncAfterSave) {
            await this.adapter.sync(this.fileCache);
        }
        if (this.options.commitOnSave) {
            await this.commit();
        }
        this.changes = [];
        this.fileMergeMaps = {};

        return { files: fileUris.length };
    }

    /**
     * Utility function: serialize target with annotations.
     *
     * @param targetAnnotations - Annotations that will be serialized.
     * @param fileUri - use alias information from this file; if none provided, use default aliases for vocabularies, non for metadata
     * @returns Annotations serialized as string for the specified language.
     */
    public serializeTarget(targetAnnotations: AnnotationListWithOrigins, fileUri?: string): string {
        const service = this.adapter.compiledService;
        const annotationFileInternal = service.annotationFiles.find((file) => file.uri === fileUri);

        let aliasInfo: AliasInformation | null = null;
        let namespaces: (Namespace | Reference)[] = [];
        if (annotationFileInternal) {
            namespaces = getAllNamespacesAndReferences(
                annotationFileInternal.namespace,
                annotationFileInternal.references
            );
        }

        aliasInfo = getAliasInformation(namespaces, this.getMetadataService().getNamespaces());
        if (!annotationFileInternal) {
            aliasInfo = addAllVocabulariesToAliasInformation(aliasInfo, this.vocabularyAPI.getVocabularies());
        }
        return this.adapter.serializeTarget(convertTargetAnnotationsToInternal(targetAnnotations, aliasInfo));
    }

    /**
     * Converts changes to the internal annotation file change format.
     *
     * @param changes - Changes in AVT format.
     * @returns Changes in internal format.
     */
    protected convertChanges(changes: Change[]): AnnotationFileChange[] {
        const compiledService = this.adapter.compiledService;
        let schema: RawMetadata | undefined;
        if (this.adapter.splitAnnotationSupport && Object.keys(this.fileMergeMaps).length === 0) {
            // make sure merge maps are filled
            schema = this.getSchema();
        }

        const schemaProvider = () => {
            if (schema) {
                return schema;
            } else {
                schema = this.getSchema();
                return schema;
            }
        };

        return this.changeConverter.convert(compiledService, this.fileMergeMaps, schemaProvider, changes);
    }

    private saveFile(path: string, content: string): void {
        this.fs.write(path, content);
    }

    private async commit(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this.fs.commit((error: any) => {
                if (error instanceof Error) {
                    reject(error);
                } else if (typeof error === 'string') {
                    reject(new Error(error));
                } else if (error) {
                    reject(new Error('Unknown error.'));
                }
                resolve();
            });
        });
    }
}

export interface SaveOptions {
    /**
     * After saving file the internal data structures will be refreshed with the updated file content.
     * Useful if you want to continue using the service instance after save.
     */
    resyncAfterSave?: boolean;
}

function applyWorkspaceEdits(
    fileUri: string,
    languageId: string,
    workspaceEdits: WorkspaceEdit,
    content: string
): string {
    const document = TextDocument.create(fileUri, languageId, 0, content);
    const fileChanges = workspaceEdits.changes ? workspaceEdits.changes[fileUri] ?? [] : [];
    return TextDocument.applyEdits(document, fileChanges);
}

function mergeAnnotations(
    compiledService: CompiledService,
    rawMetadata: RawMetadata,
    serviceName: string,
    options: { vocabulary: VocabularyService },
    mergeSplitAnnotations: boolean
): Record<string, Record<string, string>> {
    const fileMergeMaps: Record<string, Record<string, string>> = {};
    for (const annotationFile of [...compiledService.annotationFiles]) {
        const mergeMap = {};
        fileMergeMaps[annotationFile.uri] = mergeMap;
        const targets = convertAnnotationFile(annotationFile, serviceName, {
            addOrigins: true,
            vocabularyService: options.vocabulary,
            mergeSplitAnnotations: mergeSplitAnnotations,
            mergeMap
        });
        rawMetadata.schema.annotations[annotationFile.uri] = targets;
    }
    return fileMergeMaps;
}

async function getService(
    project: Project,
    serviceName: string,
    appName: string,
    clearCache: boolean
): Promise<Service> {
    if (project.projectType === 'EDMXBackend') {
        return getLocalEDMXService(project, serviceName, appName);
    } else if (project.projectType === 'CAPJava' || project.projectType === 'CAPNodejs') {
        return getCDSService(project.root, serviceName, clearCache);
    } else {
        throw new Error(`Unsupported project type "${project.projectType}"!`);
    }
}

function createAdapter(
    project: Project,
    service: Service,
    vocabularyService: VocabularyService,
    appName: string,
    writeSapAnnotations: boolean,
    ignoreChangedFileInitialContent: boolean
): AnnotationServiceAdapter {
    if (service.type === 'local-edmx') {
        return new XMLAnnotationServiceAdapter(service, vocabularyService, project, appName);
    } else if (service.type === 'cap-cds') {
        return new CDSAnnotationServiceAdapter(
            service,
            project,
            vocabularyService,
            appName,
            writeSapAnnotations,
            ignoreChangedFileInitialContent
        );
    } else {
        throw new Error(`Unsupported service type "${(service as unknown as Service).type}"!`);
    }
}

function compilerMessagesToErrors(compileMessages: Map<string, CompilerMessage>): Map<string, string[]> {
    const result: Map<string, string[]> = new Map();
    [...compileMessages.entries()].forEach((entry) => {
        const [file, value] = entry;
        if (value.hasSyntaxErrors && !file.startsWith('../')) {
            const errorMsgs = value.messages
                .filter((value) => value.severity === DiagnosticSeverity.Error)
                .map((msg) => msg.message);
            result.set(file, errorMsgs);
        }
    });
    return result;
}
