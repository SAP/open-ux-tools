import { DOMParser } from '@xmldom/xmldom';
import { promises as fsPromises } from 'fs';

export async function validateElementId(viewOrFragmentFile: string, id: string): Promise<HTMLElement | null> {
    const xmlContent = (await fsPromises.readFile(viewOrFragmentFile)).toString();
    const errorHandler = (level: string, message: string): void => {
        throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
    };
    const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
    const element = xmlDocument.getElementById(id);
    return element;
}
