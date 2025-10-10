import { pathToFileURL } from 'node:url';

import { getCdsFiles } from '@sap/ux-cds-compiler-facade';

import type { CDSService, TextFile } from '../types';

/**
 * Creates CDS service structure.
 *
 * @param projectRoot - Absolute path of the project.
 * @param serviceName - Name of the CDS service.
 * @param fileCache - Files from memfs.
 * @param clearCache - Flag indicating if the CDS file resolution cache should be cleared.
 * @returns CDS service structure.
 */
export async function getCDSService(
    projectRoot: string,
    serviceName: string,
    fileCache: Map<string, string>,
    clearCache = false
): Promise<CDSService> {
    const files = await getCdsFiles(projectRoot, fileCache, clearCache);
    const serviceFiles = files.map((uri): TextFile => {
        return { uri: pathToFileURL(uri).toString(), isReadOnly: uri.indexOf('node_modules') !== -1 };
    });
    return {
        type: 'cap-cds',
        serviceName,
        serviceFiles: serviceFiles
    };
}
