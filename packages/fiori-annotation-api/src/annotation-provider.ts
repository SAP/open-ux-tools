import { pathToFileURL } from 'node:url';

import { processServices, ServiceInfo } from '@sap-ux/project-access';
import { AnnotationFile } from '@sap-ux/odata-annotation-core-types';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import {
    CdsCompilerFacade,
    createMetadataCollector,
    getMetadataElementsFromMap,
    createCdsCompilerFacadeForRootSync
} from '@sap/ux-cds-compiler-facade';
import { toAnnotationFile, toTargetMap } from '@sap-ux/cds-odata-annotation-converter';
import { MetadataService } from '@sap-ux/odata-entity-model';

import { XMLAnnotationServiceAdapter } from './xml';
import { ServiceArtifacts, TextFile } from './types';

const vocabularyService = new VocabularyService();

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
        vocabularyService,
        { apps: {}, projectType: 'EDMXBackend', root: '' },
        ''
    );
    adapter.sync(fileCache);

    return {
        path,
        metadataService: adapter.metadataService,
        annotationFiles: adapter.getDocuments(),
        fileSequence: adapter.getAllFiles().map((file) => file.uri)
    };
}

export class CdsProvider {
    private static serviceInfoCache = new Map<string, ServiceInfo[]>();
    private static cdsCache = new Map<string, CdsCompilerFacade>();
    private static vocabularyService = new VocabularyService(true);

    public static getCdsServiceArtifacts(
        rootPath: string,
        fileCache: Map<string, string>,
        ignoreCache = false
    ): ServiceArtifacts[] {
        const facade = this.getFacade(rootPath, fileCache, ignoreCache);

        const services = this.serviceInfoCache.get(rootPath) || [];

        const result = services.map((serviceInfo) => {
            const serviceName = serviceInfo.name;

            const annotationFiles: Record<string, AnnotationFile> = {};
            const metadataElementMap = facade.getMetadata(serviceName);
            // We collect already full metadata from compile model, we don't need to build it based on paths.
            const metadataCollector = createMetadataCollector(new Map(), facade);
            const { propagationMap } = facade.getPropagatedTargetMap(serviceName);
            for (const path of facade.getAllSourceUris()) {
                const uri = pathToFileURL(path).toString();
                const cdsAnnotationFile = toTargetMap(
                    facade.blitzIndex.forUri(uri),
                    uri,
                    this.vocabularyService,
                    facade
                );

                const annotationFile = toAnnotationFile(
                    uri,
                    this.vocabularyService,
                    cdsAnnotationFile,
                    metadataCollector,
                    undefined,
                    propagationMap,
                    true
                ).file;

                annotationFiles[uri] = annotationFile;
            }
            const metadataElements = getMetadataElementsFromMap(metadataElementMap);
            const metadataService = new MetadataService({ uriMap: facade?.getUriMap() || new Map() });
            metadataService.import(metadataElements, 'DummyMetadataFileUri');

            return {
                path: uniformUrl(serviceInfo.urlPath),
                metadataService,
                annotationFiles,
                fileSequence: facade.getFileSequence().map((path) => pathToFileURL(path).toString())
            };
        });
        return result;
    }

    private static getFacade(rootPath: string, fileCache: Map<string, string>, ignoreCache = false): CdsCompilerFacade {
        const cachedValue = this.cdsCache.get(rootPath);
        if (cachedValue && ignoreCache === false) {
            return cachedValue;
        }

        console.log('compiling cds model for path:', rootPath);
        performance.mark('cds-compile-start');
        const cache = new Proxy(
            {},
            {
                get(compilerCache: Record<string, string | undefined>, path: string) {
                    const cachedValue = compilerCache[path];
                    if (cachedValue !== undefined) {
                        return cachedValue;
                    }
                    const uri = pathToFileURL(path).toString();
                    const value = fileCache.get(uri);
                    compilerCache[path] = value;
                    return value;
                }
            }
        );
        const facade = createCdsCompilerFacadeForRootSync(rootPath, [], cache);
        const services = processServices(facade.getServiceInfo());

        this.serviceInfoCache.set(rootPath, services);
        this.cdsCache.set(rootPath, facade);
        performance.mark('cds-compile-end');

        performance.measure('cds-compile', 'cds-compile-start', 'cds-compile-end');
        console.log('CDS compilation performance:', performance.getEntriesByName('cds-compile'));
        return facade;
    }
}

/**
 * Normalizes a URL by replacing backslashes with forward slashes and removing leading slashes.
 *
 * @param url - The URL to normalize.
 * @returns The normalized URL.
 */
function uniformUrl(url: string): string {
    return url
        .replace(/\\/g, '/')
        .replace(/\/\//g, '/')
        .replace(/(?:^\/)/g, '');
}
