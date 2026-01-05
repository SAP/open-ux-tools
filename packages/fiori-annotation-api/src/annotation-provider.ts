/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import { pathToFileURL } from 'node:url';

import type { ServiceInfo } from '@sap-ux/project-access';
import type { AliasInformation, AnnotationFile } from '@sap-ux/odata-annotation-core-types';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import type { CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';
import {
    createMetadataCollector,
    getMetadataElementsFromMap
    // createCdsCompilerFacadeForRootSync
} from '@sap/ux-cds-compiler-facade';
import { toAnnotationFile, toTargetMap } from '@sap-ux/cds-odata-annotation-converter';
import { MetadataService } from '@sap-ux/odata-entity-model';

import { XML_VOCABULARY_SERVICE, XMLAnnotationServiceAdapter } from './xml';
import type { ServiceArtifacts, TextFile } from './types';
import { getAliasInformation, getAllNamespacesAndReferences } from '@sap-ux/odata-annotation-core';
import { addAllVocabulariesToAliasInformation } from './vocabularies';

/**
 * Get XML service artifacts.
 *
 * @param odataVersion - Service OData version.
 * @param path - Service path.
 * @param metadataFile - Metadata file.
 * @param annotationFiles - Annotation files.
 * @param fileCache - File cache.
 * @returns Service artifacts.
 */
export function getXmlServiceArtifacts(
    odataVersion: '2.0' | '4.0',
    path: string,
    metadataFile: TextFile,
    annotationFiles: TextFile[],
    fileCache: Map<string, string>
): ServiceArtifacts {
    const adapter = new XMLAnnotationServiceAdapter(
        {
            type: 'local-edmx',
            odataVersion: odataVersion,
            metadataFile,
            annotationFiles
        },
        XML_VOCABULARY_SERVICE,
        { apps: {}, projectType: 'EDMXBackend', root: '' },
        ''
    );
    adapter.sync(fileCache);

    const documents = adapter.getDocuments();
    const aliasInformation = getAliasInfo(adapter.metadataService, XML_VOCABULARY_SERVICE, documents);

    return {
        path,
        metadataService: adapter.metadataService,
        annotationFiles: documents,
        aliasInfo: aliasInformation,
        fileSequence: adapter.getAllFiles().map((file) => file.uri)
    };
}

/**
 *
 */
export class CdsAnnotationProvider {
    private static serviceInfoCache = new Map<string, ServiceInfo[]>();
    private static serviceArtifactCache = new Map<string, Record<string, ServiceArtifacts>>();
    private static cdsCache = new Map<string, CdsCompilerFacade>();
    private static vocabularyService = new VocabularyService(true);

    /**
     * Get CDS service artifacts.
     *
     * @param rootPath - Project root path.
     * @param servicePath - Service path.
     * @param fileCache - File cache.
     * @returns Service artifacts or undefined.
     */
    public static getCdsServiceArtifacts(
        rootPath: string,
        servicePath: string,
        fileCache: Map<string, string>
    ): ServiceArtifacts | undefined {
        // eslint-disable-next-line prefer-const
        let cachedArtifactsByRoot = this.serviceArtifactCache.get(rootPath);
        if (cachedArtifactsByRoot) {
            const cachedService = cachedArtifactsByRoot[servicePath];
            if (cachedService) {
                return cachedService;
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const facade = this.getFacade(rootPath, fileCache, false);

        // const services = this.serviceInfoCache.get(rootPath) ?? [];
        // const serviceInfo = services.find((s) => uniformUrl(s.urlPath) === uniformUrl(servicePath));
        // if (!serviceInfo) {
        //     return undefined;
        // }

        // const serviceName = serviceInfo.name;

        // const annotationFiles: Record<string, AnnotationFile> = {};
        // const metadataElementMap = facade.getMetadata(serviceName);
        // // We collect already full metadata from compile model, we don't need to build it based on paths.
        // const metadataCollector = createMetadataCollector(new Map(), facade);
        // const { propagationMap } = facade.getPropagatedTargetMap(serviceName);
        // for (const path of facade.getAllSourceUris()) {
        //     const uri = pathToFileURL(path).toString();
        //     const cdsAnnotationFile = toTargetMap(facade.blitzIndex.forUri(uri), uri, this.vocabularyService, facade);

        //     const annotationFile = toAnnotationFile(
        //         uri,
        //         this.vocabularyService,
        //         cdsAnnotationFile,
        //         metadataCollector,
        //         undefined,
        //         propagationMap,
        //         true
        //     ).file;

        //     annotationFiles[uri] = annotationFile;
        // }
        // const metadataElements = getMetadataElementsFromMap(metadataElementMap);
        // const metadataService = new MetadataService({ uriMap: facade?.getUriMap() || new Map() });
        // metadataService.import(metadataElements, 'DummyMetadataFileUri');

        // const aliasInformation = getAliasInfo(metadataService, XML_VOCABULARY_SERVICE, annotationFiles);
        // const url = uniformUrl(serviceInfo.urlPath);
        // const artifacts = {
        //     path: url,
        //     metadataService,
        //     annotationFiles,
        //     aliasInfo: aliasInformation,
        //     fileSequence: facade.getFileSequence().map((path) => pathToFileURL(path).toString())
        // };

        // cachedArtifactsByRoot = {};
        // cachedArtifactsByRoot[url] = artifacts;
        // this.serviceArtifactCache.set(rootPath, cachedArtifactsByRoot);
        // return artifacts;
    }

    /**
     * Get CDS services.
     *
     * @param rootPath - Project root path.
     * @param fileCache - File cache.
     * @returns Service info array.
     */
    public static getServices(rootPath: string, fileCache: Map<string, string>): ServiceInfo[] {
        this.getFacade(rootPath, fileCache, false);
        return this.serviceInfoCache.get(rootPath) ?? [];
    }
    /**
     * Reset CDS cache clearing compile model and service artifacts.
     *
     * @param rootPath - Project root path.
     * @param fileCache - File cache.
     */
    public static resetCache(rootPath: string, fileCache: Map<string, string>): void {
        this.serviceArtifactCache.delete(rootPath);
        this.getFacade(rootPath, fileCache, true);
    }

    private static getFacade(
        rootPath: string,
        fileCache: Map<string, string>,
        _ignoreCache = false
    ): CdsCompilerFacade {
        throw new Error('Not implemented yet.');
        // const cachedValue = this.cdsCache.get(rootPath);
        // if (cachedValue && ignoreCache === false) {
        //     return cachedValue;
        // }

        // console.log('compiling cds model for path:', rootPath);
        // performance.mark('cds-compile-start');
        // const cache = new Proxy(
        //     {},
        //     {
        //         get(compilerCache: Record<string, string | undefined>, path: string) {
        //             const cachedValue = compilerCache[path];
        //             if (cachedValue !== undefined) {
        //                 return cachedValue;
        //             }
        //             const uri = pathToFileURL(path).toString();
        //             const value = fileCache.get(uri);
        //             compilerCache[path] = value;
        //             return value;
        //         }
        //     }
        // );
        // const facade = createCdsCompilerFacadeForRootSync(rootPath, [], cache);
        // const services = processServices(facade.getServiceInfo());

        // this.serviceInfoCache.set(rootPath, services);
        // this.cdsCache.set(rootPath, facade);
        // performance.mark('cds-compile-end');

        // performance.measure('cds-compile', 'cds-compile-start', 'cds-compile-end');
        // console.log('CDS compilation performance:', performance.getEntriesByName('cds-compile'));
        // return facade;
    }
}

function getAliasInfo(
    metadataService: MetadataService,
    vocabularyService: VocabularyService,
    files: Record<string, AnnotationFile>
): Record<string, AliasInformation> {
    const aliasInformation: Record<string, AliasInformation> = {};
    for (const [uri, document] of Object.entries(files)) {
        const namespaces = getAllNamespacesAndReferences(
            document.namespace ?? { name: '', type: 'namespace' },
            document.references
        );

        const aliasInfo = getAliasInformation(namespaces, metadataService.getNamespaces());
        const aliasInfoWithAllVocabularies = addAllVocabulariesToAliasInformation(
            aliasInfo,
            vocabularyService.getVocabularies()
        );
        aliasInformation[uri] = aliasInfoWithAllVocabularies;
    }
    return aliasInformation;
}

/**
 * Normalizes a URL by replacing backslashes with forward slashes and removing leading slashes.
 *
 * @param url - The URL to normalize.
 * @returns The normalized URL.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function uniformUrl(url: string): string {
    return url
        .replace(/\\/g, '/')
        .replace(/\/\//g, '/')
        .replace(/(?:^\/)/g, '');
}
