import { join } from 'node:path';
import { getFlexChangeLayer } from '../../../src/page-editor-api/project';
import { FlexChangeLayer } from '@sap/ux-specification/dist/types/src';
import fs from 'node:fs/promises';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('project', () => {
    describe('Test getFlexChangeLayer()', () => {
        const commonPath = join(__dirname, '../../test-data/original/node-ai-created');
        test('Project without sapuxLayer', async () => {
            const layer = await getFlexChangeLayer(commonPath);
            expect(layer).toEqual(FlexChangeLayer.Customer);
        });

        test('Path without package.json', async () => {
            const appPath = join(__dirname, '../../test-data');
            const layer = await getFlexChangeLayer(appPath);
            expect(layer).toEqual(FlexChangeLayer.Customer);
        });

        test('package.json with sapuxLayer', async () => {
            mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ sapuxLayer: 'VENDOR' }));
            const layer = await getFlexChangeLayer(commonPath);
            expect(layer).toEqual(FlexChangeLayer.Vendor);
        });

        test('Unparsible package.json', async () => {
            mockFs.readFile.mockResolvedValueOnce('unparseable json');
            const layer = await getFlexChangeLayer(commonPath);
            expect(layer).toEqual(FlexChangeLayer.Customer);
        });
    });
});
