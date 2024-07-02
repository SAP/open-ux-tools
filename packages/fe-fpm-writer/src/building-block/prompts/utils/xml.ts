import { DOMParser } from '@xmldom/xmldom';
import type { Editor } from 'mem-fs-editor';

export function isElementIdAvailable(fs: Editor, viewOrFragmentPath: string, id: string): boolean {
    const xmlContent = fs.read(viewOrFragmentPath).toString();
    const xmlDocument = new DOMParser({ errorHandler: (): void => {} }).parseFromString(xmlContent);
    return xmlDocument.documentElement ? !xmlDocument.getElementById(id) : true;
}
