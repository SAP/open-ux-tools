import { Editor } from 'mem-fs-editor';
import type { Manifest } from '@sap-ux/project-access';
import { join, normalize, posix } from 'path';

export async function readManifest(manifestPath: string, fs: Editor): Promise<Manifest> {
    return fs.readJSON(manifestPath) as unknown as Manifest;
}

export function getTemplatePath(relativeTemplatePath: string = ''): string {
    return join(__dirname, '../templates', relativeTemplatePath);
}

/**
 *
 * @param namespacedAppName Name of the app, like `sap.ux.app`
 * @returns Name that's acceptable in an mta.yaml
 */
export function toMtaModuleName(appId: string): string {
    return appId.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>]/gi, '');
}

export function toPosixPath(dirPath: string): string {
    return normalize(dirPath).split(/[\\/]/g).join(posix.sep);
}
