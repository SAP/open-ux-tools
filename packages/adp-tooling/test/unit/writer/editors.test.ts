import type { AnnotationsData } from '../../../src';
import { ChangeType, generateChange } from '../../../src';
import { WriterFactory } from '../../../src/writer/changes/writer-factory';
import * as memFsEditor from 'mem-fs-editor';
import * as memFs from 'mem-fs';

jest.mock('mem-fs-editor');
jest.mock('mem-fs');

describe('generateChange', () => {
    const writeSpy = jest.fn();
    const createStorageSpy = jest.spyOn(memFs, 'create').mockReturnValue({} as memFs.Store);
    const createEditorSpy = jest.spyOn(memFsEditor, 'create').mockReturnValue({} as memFsEditor.Editor);

    beforeEach(() => {
        jest.clearAllMocks();
        WriterFactory.createWriter = jest.fn().mockReturnValue({ write: writeSpy });
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
        expect(createEditorSpy).toHaveBeenCalled();
        expect(createStorageSpy).toHaveBeenCalled();
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
            {} as memFsEditor.Editor
        );

        expect(WriterFactory.createWriter).toHaveBeenCalledWith(
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            {},
            '/path/to/project',
            undefined
        );

        expect(writeSpy).toHaveBeenCalledWith({ variant: {}, annotation: {} });
        expect(createEditorSpy).not.toHaveBeenCalled();
        expect(createStorageSpy).not.toHaveBeenCalled();
        expect(fs).toBeDefined();
    });
});
