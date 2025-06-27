import { DirName } from '@sap-ux/project-access';
import type { AppDescriptorV4Change } from '../types';
import { join } from 'path';

/**
 * Generates the fragment path from the given template string and change object.
 *
 * @param template - The template string representing the fragment.
 * @param change - The AppDescriptorV4Change object containing change details.
 * @returns The computed fragment path as a string.
 */
export function getFragmentPathFromTemplate(template: string, change: AppDescriptorV4Change): string {
    let path = '';
    const segments = template.split(`${change.projectId}.${DirName.Changes}.${DirName.Fragments}.`);
    const [namespace, fileName] = segments;
    if (segments.length === 2 && namespace === '') {
        path = join(DirName.Changes, DirName.Fragments, fileName);
    } else {
        path = join(...template.split('.'));
    }
    return path;
}
