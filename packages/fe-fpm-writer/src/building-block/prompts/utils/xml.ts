import { DOMParser } from '@xmldom/xmldom';
import type { Editor } from 'mem-fs-editor';

/**
 * Method validates if passed id is available.
 *
 * @param fs  - the file system object for reading files
 * @param viewOrFragmentPath - path to fragment or view file
 * @param id - id to check/validate
 * @returns true if passed id is available.
 */
export function isElementIdAvailable(fs: Editor, viewOrFragmentPath: string, id: string): boolean {
    const xmlContent = fs.read(viewOrFragmentPath).toString();
    const xmlDocument = new DOMParser({ errorHandler: (): void => {} }).parseFromString(xmlContent);
    return xmlDocument.documentElement ? !xmlDocument.getElementById(id) : true;
}
