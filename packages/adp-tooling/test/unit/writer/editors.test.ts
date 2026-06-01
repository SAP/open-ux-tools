import { jest } from '@jest/globals';
import type { Editor as MFSEditor, Store } from 'mem-fs-editor';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockCreate = jest.fn().mockReturnValue({} as MFSEditor);
jest.unstable_mockModule('mem-fs-editor', () => ({
    create: mockCreate
}));

const mockCreateStorage = jest.fn().mockReturnValue({} as Store);
jest.unstable_mockModule('mem-fs', () => ({
    create: mockCreateStorage
}));

const { generateChange } = await import('../../../src/writer/editors');
const { ChangeType } = await import('../../../src/types');
const { WriterFactory } = await import('../../../src/writer/changes/writer-factory');
import type { AnnotationsData } from '../../../src/types';

describe('generateChange', () => {
    const writeSpy = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        WriterFactory.createWriter = jest.fn().mockReturnValue({ write: writeSpy }) as any;
        mockCreate.mockReturnValue({} as MFSEditor);
        mockCreateStorage.mockReturnValue({} as Store);
    });

    it('should successfully invoke the writer for a given generator type', async () => {
        const fs = await generateChange(
            '/path/to/project',
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            {
                variant: {},
                annotation: {}
            } as AnnotationsData,
            null,
            '/path/to/templates'
        );

        expect(WriterFactory.createWriter).toHaveBeenCalledWith(
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            expect.anything(),
            '/path/to/project',
            '/path/to/templates'
        );

        expect(writeSpy).toHaveBeenCalledWith({ variant: {}, annotation: {} });
        expect(mockCreate).toHaveBeenCalled();
        expect(mockCreateStorage).toHaveBeenCalled();
        expect(fs).toBeDefined();
    });

    it('should successfully invoke the writer for a given generator type with passed editor', async () => {
        const fs = await generateChange(
            '/path/to/project',
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            {
                variant: {},
                annotation: {}
            } as AnnotationsData,
            {} as MFSEditor
        );

        expect(WriterFactory.createWriter).toHaveBeenCalledWith(
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            {},
            '/path/to/project',
            undefined
        );

        expect(writeSpy).toHaveBeenCalledWith({ variant: {}, annotation: {} });
        expect(mockCreate).not.toHaveBeenCalled();
        expect(mockCreateStorage).not.toHaveBeenCalled();
        expect(fs).toBeDefined();
    });
});
