import { fileURLToPath } from 'url';

import type { AnnotationFile, Namespace, Reference } from '@sap-ux/odata-annotation-core-types';
import { Range } from '@sap-ux/odata-annotation-core-types';
import type { Target } from '@sap-ux/cds-odata-annotation-converter';
import type {
    Assignment,
    AnnotationNode,
    AnnotationGroupItems,
    Collection,
    Record
} from '@sap-ux/cds-annotation-parser';
import { type CdsCompilerFacade, type MetadataCollector, type PropagatedTargetMap } from '@sap/ux-cds-compiler-facade';
import { toAnnotationFile, toTargetMap } from '@sap-ux/cds-odata-annotation-converter';
import type { VocabularyService } from '@sap-ux/odata-vocabularies';

import { compareByRange, pathFromUri } from '../utils';
import type { TextFile } from '../types';

import type { Comment } from './comments';
import { collectComments } from './comments';
import type { CompilerToken } from './cds-compiler-tokens';

export const CDS_DOCUMENT_TYPE = 'document';
export type CDSDocument = {
    type: typeof CDS_DOCUMENT_TYPE;
    uri: string;
    namespace?: Namespace;
    references: Reference[];
    targets: Target[];
    range?: Range;
};

export interface Document {
    uri: string;
    ast: CDSDocument;
    comments: Comment[];
    tokens: CompilerToken[];
    annotationFile: AnnotationFile;
}

export type AstNode = Reference | Target | Assignment | AnnotationNode | CDSDocument;

/**
 * Creates CDS document.
 *
 * @param serviceName - Name of the service.
 * @param vocabularyService - Vocabulary API.
 * @param facade - CDS compiler facade instance.
 * @param fileCache - File content cache.
 * @param file - File
 * @param metadataCollector - Metadata collector instance.
 * @returns CDS document.
 */
export function getDocument(
    serviceName: string,
    vocabularyService: VocabularyService,
    facade: CdsCompilerFacade,
    fileCache: Map<string, string>,
    file: TextFile,
    metadataCollector: MetadataCollector
): Document {
    const comments = getComments(fileCache, file, facade, false);
    const cdsAnnotationFile = toTargetMap(facade.blitzIndex.forUri(file.uri), file.uri, vocabularyService, facade);
    const tokens = facade.getTokensForUri(pathFromUri(file.uri));
    const line = fileCache.get(file.uri)?.split('\n').length ?? 0;
    const character = fileCache.get(file.uri)?.split('\n').pop()?.length ?? 0;
    const range = Range.create(0, 0, line, character);
    const cdsDocument: CDSDocument = {
        type: 'document',
        uri: file.uri,
        range,
        namespace: cdsAnnotationFile.namespace,
        references: cdsAnnotationFile.references,
        targets: [...(cdsAnnotationFile.targetMap || [])].map(([, value]) => value)
    };

    const annotationFile = toAnnotationFile(file.uri, vocabularyService, cdsAnnotationFile, metadataCollector).file;

    filterTargets(serviceName, annotationFile);

    return {
        uri: file.uri,
        comments,
        ast: cdsDocument,
        annotationFile: annotationFile,
        tokens
    };
}

function getComments(
    fileCache: Map<string, string>,
    file: TextFile,
    facade: CdsCompilerFacade,
    ignoreComments = true
): Comment[] {
    const content = fileCache.get(file.uri);
    if (content === undefined || content === null) {
        throw new Error(`File ${file.uri} not found in cache!`);
    }
    const tokenVector = facade.getTokensForUri(fileURLToPath(file.uri));
    return ignoreComments ? [] : collectComments(tokenVector);
}
/**
 * Creates ghost file document.
 *
 * @param serviceName - Name of the service.
 * @param vocabularyService - Vocabulary API.
 * @param facade - CDS compiler facade instance.
 * @param fileCache - File content cache.
 * @param file - File
 * @param metadataCollector - Metadata collector instance.
 * @param propagatedTargetMap - Propagation map.
 * @returns Ghost file document.
 */
export function getGhostFileDocument(
    serviceName: string,
    vocabularyService: VocabularyService,
    facade: CdsCompilerFacade,
    fileCache: Map<string, string>,
    file: TextFile,
    metadataCollector: MetadataCollector,
    propagatedTargetMap: PropagatedTargetMap
): Document {
    const comments = getComments(fileCache, file, facade, false);
    const tokens = facade.getTokensForUri(pathFromUri(file.uri));
    const cdsAnnotationFile = toTargetMap(facade.blitzIndex.forUri(file.uri), file.uri, vocabularyService, facade);
    const annotationFile = toAnnotationFile(
        file.uri,
        vocabularyService,
        cdsAnnotationFile,
        metadataCollector,
        undefined,
        propagatedTargetMap
    ).file;

    filterTargets(serviceName, annotationFile);

    annotationFile.uri = '!' + annotationFile.uri;
    const cdsDocument: CDSDocument = {
        type: 'document',
        uri: annotationFile.uri,
        namespace: cdsAnnotationFile.namespace,
        references: cdsAnnotationFile.references,
        targets: [...(cdsAnnotationFile.targetMap || [])].map(([, value]) => value)
    };

    return {
        uri: annotationFile.uri,
        comments,
        tokens,
        ast: cdsDocument,
        annotationFile: annotationFile
    };
}

function filterTargets(serviceName: string, annotationFile: AnnotationFile): void {
    // only allow targets pointing to current service
    const serviceNamespace = annotationFile.namespace?.name === serviceName ? annotationFile.namespace : undefined;
    const aliasName = serviceNamespace ? serviceNamespace.alias : '';
    annotationFile.targets = annotationFile.targets.filter(
        (target) => target.name.startsWith(serviceName + '.') || (aliasName && target.name.startsWith(aliasName + '.'))
    );
}

export type ContainerNode = Target | AnnotationGroupItems | Collection | Record;

/**
 * Returns the number of children in the container node.
 *
 * @param container - Container AST node.
 * @returns Number of children.
 */
export function getChildCount(container: ContainerNode): number {
    return getItems(container).length;
}

/**
 * Returns child nodes for the given container node.
 *
 * @param container - Container AST node.
 * @returns All child nodes of the container.
 */
export function getItems(container: ContainerNode): AstNode[] {
    switch (container.type) {
        case 'target':
            return container.assignments;
        case 'record':
            return container.annotations?.length
                ? [...container.properties, ...container.annotations].sort(compareByRange)
                : container.properties;
        case 'annotation-group-items':
        case 'collection':
            return container.items;
        default:
            return [];
    }
}
