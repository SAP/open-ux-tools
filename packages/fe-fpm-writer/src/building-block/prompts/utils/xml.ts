import { DOMParser } from '@xmldom/xmldom';
import type { Editor } from 'mem-fs-editor';

export function isElementIdAvailable(fs: Editor, viewOrFragmentFile: string, id: string): boolean {
    const xmlContent = fs.read(viewOrFragmentFile).toString();
    const xmlDocument = new DOMParser({ errorHandler: (): void => {} }).parseFromString(xmlContent);
    return xmlDocument.documentElement ? !xmlDocument.getElementById(id) : true;
}
