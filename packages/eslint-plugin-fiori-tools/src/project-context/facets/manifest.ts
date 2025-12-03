import { ODataVersionType } from '@sap-ux/odata-annotation-core';
import { Manifest } from '@sap-ux/project-access';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';
import { File, LocalFile, RemoteFileWithLocalServiceCache, RemoteServiceFileWithToolsCache } from '../types';

export interface IndexedManifest {
    manifestUri: string;
    flexEnabled: boolean;
    minUI5Version?: string;
    mainServiceName: string;
    services: Services;
    customViews: CustomViews;
    appId: string;
}

export interface Services {
    [name: string]: ODataService;
}

export interface ODataService {
    name: string;
    path: string;
    version: ODataVersionType;
    /**
     * For CAP CDS services this will be undefined as there are no metadata files in the project.
     */
    metadata: RemoteServiceFileWithToolsCache | RemoteFileWithLocalServiceCache | undefined;
    annotationFiles: File[];
}

export interface AnnotationSource {
    path: string;
}

interface Targets {
    [name: string]: FeV4ListReportTarget;
}

interface FeV4ListReportTarget {
    type: string;
    id: string;
    name: 'sap.fe.templates.ListReport';
    options?: {
        settings?: {
            contextPath?: string;
            entitySet?: string;
        };
    };
}

export interface CustomViews {
    [name: string]: { entitySet?: string; contextPath?: string };
}

export function indexManifest(manifestPath: string, manifest: Manifest): IndexedManifest {
    const webappPath = dirname(manifestPath);
    const customViews: CustomViews = {};
    const services: Services = {};
    const targets = manifest['sap.ui5']?.routing?.targets;
    for (const [name, target] of Object.entries(targets ?? {})) {
        const settings = target.options?.settings;
        if (settings?.entitySet || settings?.contextPath) {
            if (settings.viewName) {
                customViews[settings.viewName] = {
                    entitySet: settings.entitySet,
                    contextPath: settings.contextPath
                };
            }
        }
    }

    const mainServiceName = getMainService(manifest) ?? '';

    const manifestDataSources = manifest['sap.app']?.dataSources ?? {};
    for (const [dataSourceName, dataSource] of Object.entries(manifestDataSources)) {
        if (dataSource.type !== 'OData' || !dataSource.uri) {
            continue;
        }
        const localUri = dataSource.settings?.localUri;
        if (!localUri) {
            continue;
            // TODO: log error
            // throw new Error(
            //     `Missing metadata localUri for data source ${dataSourceName} in ${join(webappPath, FileName.Manifest)}`
            // );
        }
        const metadataPath = join(webappPath, localUri);
        const metadataUri = pathToFileURL(metadataPath).toString();

        const annotationFiles = getAnnotationFiles(webappPath, dataSource, manifestDataSources);
        services[dataSourceName] = {
            name: dataSourceName,
            path: dataSource.uri,
            version: dataSource.settings?.odataVersion ?? '2.0',
            metadata: {
                type: 'remote',
                cacheType: 'local-service',
                cachePath: metadataPath,
                relativeBackendPath: `${dataSource.uri}$metadata`,
                uri: metadataUri
            },
            annotationFiles
        };
    }

    const mainServicePath = getServicePath(manifest, mainServiceName) ?? '/';
    const flexEnabled = getFlexEnabled(manifest);
    const minUI5Version = getMinUI5Version(manifest);
    const index: IndexedManifest = {
        manifestUri: pathToFileURL(manifestPath).toString(), // TODO: handle windows paths
        flexEnabled,
        minUI5Version,
        customViews,
        services,
        appId: manifest['sap.app']?.id ?? '',
        mainServiceName
    };
    return index;
}

type DataSources = Exclude<Manifest['sap.app']['dataSources'], undefined>;
type DataSource = DataSources[keyof DataSources];

function getAnnotationFiles(
    webappPath: string,
    dataSource: DataSource,
    manifestDataSources: DataSources
): (LocalFile | RemoteFileWithLocalServiceCache)[] {
    const annotationFiles: (LocalFile | RemoteFileWithLocalServiceCache)[] = [];
    for (const id of dataSource.settings?.annotations ?? []) {
        const annotationDataSource = manifestDataSources[id];
        if (annotationDataSource.type !== 'ODataAnnotation') {
            continue;
        }
        const { settings, uri } = annotationDataSource;
        const localUri = settings?.localUri ?? '';
        const filePath = join(webappPath, localUri);
        const annotationFileUri = pathToFileURL(filePath).toString();
        const isReadonly = !(uri && localUri && localUri === uri);
        if (isReadonly) {
            annotationFiles.push({
                type: 'remote',
                cacheType: 'local-service',
                cachePath: filePath,
                relativeBackendPath: uri,
                uri: annotationFileUri
            });
        } else {
            annotationFiles.push({
                type: 'local',
                uri: annotationFileUri
            });
        }
    }
    return annotationFiles;
}

/**
 * Get service path defined under `sap.app->dataSources`
 * @param manifest manifest of an app
 * @param serviceName name of data source
 */
function getServicePath(manifest: Manifest, serviceName: string): string | undefined {
    const dataSources = manifest['sap.app']?.dataSources;

    if (dataSources) {
        const defaultModelDataSource = dataSources[serviceName];

        return defaultModelDataSource?.uri;
    }
    return undefined;
}

function getFlexEnabled(manifest: Manifest): boolean {
    return manifest['sap.ui5']?.flexEnabled ?? false;
}

function getMinUI5Version(manifest: Manifest): string | undefined {
    const value = manifest['sap.ui5']?.dependencies?.minUI5Version;
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}

/**
 * Get main service defined in manifest under `sap.ui5->models`
 * @param manifest manifest of an app
 */
function getMainService(manifest: Manifest): string | undefined {
    const model = manifest['sap.ovp']?.globalFilterModel ?? '';
    return manifest['sap.ui5']?.models?.[model]?.dataSource;
}
