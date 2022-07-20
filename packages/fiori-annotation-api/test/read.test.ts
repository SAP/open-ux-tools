import { readFile } from 'fs/promises';
import { join, sep } from 'path';
import { pathToFileURL } from 'url';

import type { LocalService, TextFile } from '../src/services';
import { readAnnotations } from '../src/read';

const DATA_DIR = join(__dirname, 'data');
const V2_APP_DIR = join(DATA_DIR, 'v2-app');

describe('read', () => {
    describe('xml', () => {
        test('v2-app', async () => {
            const webapp = join(V2_APP_DIR, 'webapp');
            const metadataFile = await readTextFile(join(webapp, 'localService', 'metadata.xml'), true);
            const annotationFileParameters: [string, boolean][] = [
                [join(webapp, 'localService', 'SEPMRA_PROD_MAN_ANNO_MDL.xml'), false],
                [join(webapp, 'annotations', 'annotation0.xml'), true]
            ];
            const annotationFiles = await Promise.all(
                annotationFileParameters.map((params) => readTextFile(...params))
            );
            const service: LocalService = {
                type: 'local',
                annotationFiles,
                metadataFile
            };
            const annotations = readAnnotations(service);
            expect(normalizeUris(webapp, annotations)).toMatchSnapshot();
        });
    });
});

function normalizeUris<T extends object>(root: string, data: T): T {
    const text = JSON.stringify(data);

    const sepRegex = new RegExp(sep, 'g');
    const converted = text.replace(/file:\/\/([^ "]*)/g, (match, group1) => {
        return 'file://' + group1.replace(root, '').replace(sepRegex, '/');
    });
    return JSON.parse(converted);
}

async function readTextFile(path: string, isReadOnly?: boolean): Promise<TextFile> {
    const buffer = await readFile(path, 'utf-8');
    const content = buffer.toString();
    const uri = pathToFileURL(path).toString();
    return {
        content,
        uri,
        isReadOnly
    };
}
