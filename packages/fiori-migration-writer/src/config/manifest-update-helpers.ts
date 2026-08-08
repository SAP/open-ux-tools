// CLASSIFICATION: [OPEN]
import { DirName } from '../project-spec-types.js';
import type { TemplateData } from '../types.js';

/**
 * Data source types from manifest
 */
enum DataSourceType {
    OData = 'OData',
    ODataAnnotation = 'ODataAnnotation'
}

/**
 * Check if a data source should be processed
 *
 * @param dataSource
 */
function shouldProcessDataSource(dataSource: any): boolean {
    return (
        dataSource.type === DataSourceType.OData ||
        dataSource.type === undefined ||
        dataSource.type === DataSourceType.ODataAnnotation
    );
}

/**
 * Determine the local file system path for a data source
 *
 * @param dataSource
 * @param dataSourceKey
 * @param templateData
 */
function determineLocalFsPath(dataSource: any, dataSourceKey: string, templateData: TemplateData): string | undefined {
    let localFsPath: string | undefined;

    if (dataSource.type === DataSourceType.OData || dataSource.type === undefined) {
        localFsPath = templateData.mainServiceFsPath;
    } else {
        localFsPath = dataSource.settings?.localUri ?? `${DirName.LocalService}/${dataSourceKey}.xml`;
    }

    // Fix case for 'localservice' -> 'localService'
    return localFsPath?.replace('localservice', DirName.LocalService);
}

/**
 * Check if localUri needs updating
 *
 * @param settings
 */
function needsLocalUriUpdate(settings: any): boolean {
    return !settings.localUri || settings.localUri.length === 0 || settings.localUri.includes('localservice');
}

/**
 * Update settings with local URI
 *
 * @param dataSource
 * @param localFsPath
 */
function updateLocalUri(dataSource: any, localFsPath: string): boolean {
    if (dataSource.settings) {
        if (needsLocalUriUpdate(dataSource.settings)) {
            dataSource.settings.localUri = localFsPath;
            return true;
        }
    } else {
        dataSource.settings = { localUri: localFsPath };
        return true;
    }
    return false;
}

/**
 * Process a single data source entry
 *
 * @param dataSource
 * @param dataSourceKey
 * @param templateData
 */
export function processDataSource(dataSource: any, dataSourceKey: string, templateData: TemplateData): boolean {
    let modified = false;

    if (!shouldProcessDataSource(dataSource)) {
        return false;
    }

    // Set type if undefined
    if (dataSource.type === undefined) {
        dataSource.type = DataSourceType.OData;
        modified = true;
    }

    // Determine and update local file system path
    const localFsPath = determineLocalFsPath(dataSource, dataSourceKey, templateData);
    if (localFsPath) {
        modified = updateLocalUri(dataSource, localFsPath) || modified;
    }

    return modified;
}
