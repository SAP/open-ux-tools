import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlexChangeLayer } from '@sap/ux-specification/dist/types/src';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock fs/promises
const mockReadFile = jest.fn<any>();
const actualFsPromises = await import('node:fs/promises');
jest.unstable_mockModule('fs/promises', () => ({
    ...actualFsPromises,
    default: {
        ...actualFsPromises,
        readFile: mockReadFile
    },
    readFile: mockReadFile
}));
jest.unstable_mockModule('node:fs/promises', () => ({
    ...actualFsPromises,
    default: {
        ...actualFsPromises,
        readFile: mockReadFile
    },
    readFile: mockReadFile
}));

const { getFlexChangeLayer } = await import('../../../src/page-editor-api/project.js');

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
            mockReadFile.mockResolvedValueOnce(JSON.stringify({ sapuxLayer: 'VENDOR' }));
            const layer = await getFlexChangeLayer(commonPath);
            expect(layer).toEqual(FlexChangeLayer.Vendor);
        });

        test('Unparsible package.json', async () => {
            mockReadFile.mockResolvedValueOnce('unparseable json');
            const layer = await getFlexChangeLayer(commonPath);
            expect(layer).toEqual(FlexChangeLayer.Customer);
        });
    });
});
