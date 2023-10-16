import AdmZip from 'adm-zip';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Helper function to recursively get a list of all files in a given folder and its sub folders.
 *
 * @param path - path to the folder that is to be searched
 * @returns list of files names
 */
export function getFileNames(path: string): string[] {
    const names: string[] = [];

    const files = readdirSync(path);
    for (const file of files) {
        const filePath = join(path, file);
        if (statSync(filePath).isDirectory()) {
            names.push(...getFileNames(filePath));
        } else {
            names.push(filePath);
        }
    }
    return names;
}

/**
 * Checks whether a given zip files contains an adaptation project by checking whether it includes an manifest.appdescr_variant file.
 *
 * @param archive buffer representing a zip file
 * @returns true if it contains an adaptation project
 */
export function isAdaptationProject(archive: Buffer): boolean {
    const zip = new AdmZip(archive);
    return !!zip.getEntry('manifest.appdescr_variant');
}
