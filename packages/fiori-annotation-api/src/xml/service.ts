import { pathToFileURL } from 'url';

import type { Project } from '@sap-ux/project-access';

import type { TextFile, LocalEDMXService } from '../types';

/**
 * Creates local EDMX service structure.
 *
 * @param project - Project structure.
 * @param serviceName - Name of the service that is specified in manifest.
 * @param appName - Name of the application.
 * @returns Service structure.
 */
export function getLocalEDMXService(project: Project, serviceName: string, appName?: string): LocalEDMXService {
    // find app - use first app if no appName is provided or app with such name doesn't exist
    const app = project.apps[adjustAppNameByProjectData(appName, project)];
    const service = app?.services[serviceName];

    if (!service?.local) {
        // We can not continue without metadata, stop here.
        throw new Error(`Metadata file for service ${serviceName} in app ${appName} is not found!`);
    }
    const metadataFilePath = service.local ?? '';
    const metadataFileUri = pathToFileURL(metadataFilePath).toString();
    const metadataFile = { uri: metadataFileUri, isReadOnly: true };

    // Note: Currently multiple backend annotation files are not supported.
    const serviceAnnotations = service?.annotations ?? [];
    const uris = serviceAnnotations.map((item) => pathToFileURL(item.local ?? '').toString());
    const backendAnnotationFileIdx = serviceAnnotations.findIndex(
        (annotation, idx) =>
            typeof annotation.local === 'string' &&
            typeof annotation.uri === 'string' &&
            !uris[idx].endsWith(annotation.uri)
    );
    const backendAnnotationFileUri = uris[backendAnnotationFileIdx] ?? '';
    const annotationFiles = uris.map((uri): TextFile => {
        const isReadOnly = uri === backendAnnotationFileUri;
        return { uri, isReadOnly };
    });

    return {
        type: 'local-edmx',
        odataVersion: service.odataVersion ?? '2.0',
        metadataFile,
        annotationFiles
    };
}

function adjustAppNameByProjectData(requestedAppName: string | undefined, project: Project): string {
    if (requestedAppName && project.apps[requestedAppName]) {
        return requestedAppName;
    } else if (project.apps['']) {
        return '';
    } else {
        return Object.keys(project.apps)[0] || '';
    }
}
