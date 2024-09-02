import type { AnnotationsData } from '../../../src';
import { ChangeType, generateChange } from '../../../src';
import { WriterFactory } from '../../../src/writer/changes/writer-factory';

describe('generateChange', () => {
    const writeSpy = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        WriterFactory.createWriter = jest.fn().mockReturnValue({ write: writeSpy });
    });

    it('should successfully invoke the writer for a given generator type', async () => {
        const fs = await generateChange('/path/to/project', ChangeType.ADD_ANNOTATIONS_TO_ODATA, {
            variant: {},
            annotation: {}
        } as AnnotationsData);

        expect(WriterFactory.createWriter).toHaveBeenCalledWith(
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            expect.anything(),
            '/path/to/project'
        );

        expect(writeSpy).toHaveBeenCalledWith({ variant: {}, annotation: {} });
        expect(fs).toBeDefined();
    });
});
