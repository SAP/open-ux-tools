import type { Editor } from 'mem-fs-editor';
import prettifyXml from 'prettify-xml';

import { DirName, getProject, getWebappPath } from '@sap-ux/project-access';
import { AbapServiceProvider, createForDestination } from '@sap-ux/axios-extension';
import { createAbapServiceProvider } from '@sap-ux/system-access';

import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';

import type { OdataService } from '../types';
import { ToolsLogger } from '../../../logger/src';
import { join } from 'path';

/**
 * Writes the odata service related data and files to an existing UI5 project specified by the base path.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param appName - the name of the application
 * @param service - the OData service instance
 * @param provider - the service provider
 * @param fs - the memfs editor instance
 * @throws - if required UI5 project files are not found
 * @returns the updated memfs editor instance
 */
export async function generate(
    basePath: string,
    appName: string,
    service: OdataService,
    provider: AbapServiceProvider,
    fs: Editor
): Promise<FioriAnnotationService> {
    const serviceName = 'mainService';
    const project = await getProject(basePath, fs);
    const annotationService = await FioriAnnotationService.createService(project, serviceName, appName, fs, {
        commitOnSave: false,
        clearFileResolutionCache: true
    });
    await annotationService.sync();

    const valueListReferences = service.path ? annotationService.getValueListReferences(service.path) : []; // TODO: throw error?
    if (valueListReferences.length) {
        const webappPath = await getWebappPath(basePath, fs);
        const promises = valueListReferences.map(async (ref) => {
            const first = ref.items[0]?.values[0];
            if (!first) {
                return;
            }

            const file = await provider.service(first).metadata();
            fs.write(
                join(webappPath, DirName.LocalService, 'value-list-references', serviceName, `${ref.target}.xml`),
                prettifyXml(file, { indent: 4 })
            );
        });
        await Promise.allSettled(promises);
    }

    return annotationService;
}
