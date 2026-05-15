import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import type { Specification } from '@sap/ux-specification/dist/types/src';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { merge as realMerge, parse } from '@sap-ux/edmx-parser';

const mockMerge = jest.fn();

jest.unstable_mockModule('@sap-ux/edmx-parser', () => ({
    merge: mockMerge,
    parse
}));

const { getEntityModel } = await import('../src/data-download/utils');

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('getEntityModel', () => {
    const travelAppPath = join(__dirname, 'test-data/test-apps/travel/webapp');
    const annotationPath = join(travelAppPath, 'annotations/annotation.xml');
    const metadataPath = join(travelAppPath, 'localService/mainService/metadata.xml');

    let mockSpecification: { readApp: jest.Mock };

    beforeEach(() => {
        mockSpecification = {
            readApp: jest.fn().mockResolvedValue({ files: [], version: '1.0', appAccess: {} } as never)
        };
        mockMerge.mockClear();
    });

    function makeAppAccess(annotations: { local?: string }[]): ApplicationAccess {
        return {
            app: { services: { mainService: { local: metadataPath, annotations } } },
            getAppRoot: jest.fn().mockReturnValue(travelAppPath)
        } as unknown as ApplicationAccess;
    }

    it('should call merge when local annotation files are present in the manifest', async () => {
        mockMerge.mockImplementation(realMerge as unknown as (...args: unknown[]) => unknown);
        const metadata = await readFile(metadataPath, 'utf8');

        await getEntityModel(
            makeAppAccess([{ local: annotationPath }]),
            mockSpecification as unknown as Specification,
            metadata
        );

        expect(mockMerge).toHaveBeenCalled();
        const [, ...annotationArgs] = mockMerge.mock.calls[0];
        expect(annotationArgs).toHaveLength(1);
    });

    it('should not call merge when no annotation files are listed', async () => {
        const metadata = await readFile(metadataPath, 'utf8');

        await getEntityModel(makeAppAccess([]), mockSpecification as unknown as Specification, metadata);

        expect(mockMerge).not.toHaveBeenCalled();
    });

    it('should skip annotation entries whose local path does not exist', async () => {
        const metadata = await readFile(metadataPath, 'utf8');

        await getEntityModel(
            makeAppAccess([{ local: '/non/existent/annotation.xml' }]),
            mockSpecification as unknown as Specification,
            metadata
        );

        expect(mockMerge).not.toHaveBeenCalled();
    });
});
