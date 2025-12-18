import type {
    AnnotationFile,
    CompilerMessage,
    Element,
    Location,
    Target,
    WorkspaceEdit
} from '@sap-ux/odata-annotation-core-types';
import type { MetadataService } from '@sap-ux/odata-entity-model';

import type { AnnotationFileChange } from './internal-change';
import type { Service, CompiledService } from './service';
import type { TextFile } from './text-file';

type ValidationResultType = Map<string, CompilerMessage> | void;
export interface ValueListReference {
    location: Location;
    annotation: Element;
    uris: string[];
}

/**
 * Defines a set of functions that needs to be implemented to provide
 * annotation editing capabilities for the given language.
 */
export interface AnnotationServiceAdapter {
    readonly metadataService: MetadataService;
    readonly compiledService: CompiledService;
    readonly splitAnnotationSupport: boolean;
    /**
     *
     */
    getAllFiles(includeGhostFiles?: boolean): TextFile[];
    /**
     *
     */
    sync(
        fileCache: Map<string, string>,
        projectAppName?: string,
        projectApps?: string[]
    ): Promise<ValidationResultType> | ValidationResultType;
    /**
     *
     * @param uri
     * @param data
     */
    syncExternalService(uri: string, data: string): void;
    getExternalServices(): {
        uri: string;
        metadata: MetadataService;
        compiledService: CompiledService;
    }[];
    /**
     *
     */
    getWorkspaceEdit(changes: AnnotationFileChange[]): Promise<WorkspaceEdit>;
    /**
     *
     */
    validateChanges(fileCache: Map<string, string>): Promise<ValidationResultType> | ValidationResultType;
    /**
     *
     */
    getInitialFileContent?(serviceName: string, uri: string): string;
    /**
     * Converts target to string
     *
     * @param target - Content of an 'Annotations' element
     */
    serializeTarget(target: Target): string;

    /**
     * Get mapping from targets to value list references
     */
    getValueListReferences(): Map<string, ValueListReference[]>;
}

export interface AnnotationServiceConstructor<T extends Service> {
    new (service: T): AnnotationServiceAdapter;
}
