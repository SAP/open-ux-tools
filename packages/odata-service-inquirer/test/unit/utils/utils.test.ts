import { readFile } from 'fs/promises';
import { join } from 'path';
import { removeOrigin } from '../../../src/utils/index';

describe('Utils', () => {
    const data: string[][] = [
        ['metadata1.xml', 'relativeMetadata1.xml'],
        ['metadata2.xml', 'relativeMetadata2.xml']
    ];
    data.forEach((args: string[]) => {
        const metadataFile: string = args[0];
        const relativeMetadataFile: string = args[1];
        it(`removeOrigin('${metadataFile}')`, async () => {
            const metadata: string = await readFile(join(__dirname, `fixtures/${metadataFile}`), 'utf8');
            const relativeMetadata: string = await readFile(
                join(__dirname, `fixtures/${relativeMetadataFile}`),
                'utf8'
            );
            expect(removeOrigin(metadata)).toEqual(relativeMetadata);
        });
    });
});
