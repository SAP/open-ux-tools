import type { Editor } from 'mem-fs-editor';
import prettifyXml from 'prettify-xml';

import { DirName, getWebappPath } from '@sap-ux/project-access';

import type { OdataService } from '../types';
import { join, relative } from 'path';

export interface ValueListReferences {
    target: string;
    references: { data?: string; path: string }[];
}

/**
 * Writes service metadata for value list references to the local service folder.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param valueListReferences - Value list references to be generated
 * @param service - the OData service instance
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export async function writeValueListReferenceMetadata(
    basePath: string,
    valueListReferences: Record<string, { data?: string; path: string }[]>,
    service: OdataService,
    fs: Editor
): Promise<void> {
    const targets = Object.keys(valueListReferences);
    if (!targets.length) {
        return;
    }
    const webappPath = await getWebappPath(basePath, fs);
    const map: Record<string, string> = {};
    for (const target of targets) {
        for (const reference of valueListReferences[target]) {
            const [valueListServicePath] = reference.path.split(';');
            const segments = valueListServicePath.split('/');
            let prefix = '/';
            while (segments.length) {
                const next = join(prefix, segments.shift()!);
                if (!service.path!.startsWith(next)) {
                    break;
                }
                prefix = next;
            }
            const relativeServicePath = valueListServicePath.replace(prefix, '');

            const path = join(
                webappPath,
                DirName.LocalService,
                'value-list-references',
                service.name ?? 'mainService',
                target,
                `${relativeServicePath}.xml`
            );

            if (reference.data) {
                map[reference.path] = relative(webappPath, path);
                fs.write(path, prettifyXml(reference.data, { indent: 4 }));
            }
        }
    }
    fs.write(
        join(webappPath, DirName.LocalService, 'value-list-references', 'service-map.json'),
        JSON.stringify(map, undefined, 4)
    );
}
