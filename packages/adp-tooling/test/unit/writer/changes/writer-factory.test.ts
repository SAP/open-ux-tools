import type { Editor } from 'mem-fs-editor';

import { WriterFactory } from '../../../../src/writer/changes/writer-factory';
import { GeneratorType } from '../../../../src';
import { AnnotationsWriter } from '../../../../src/writer/changes/change-writers';

describe('WriterFactory', () => {
    it('should create an AnnotationsWriter for ADD_ANNOTATIONS_TO_ODATA type', () => {
        const writer = WriterFactory.createWriter(
            GeneratorType.ADD_ANNOTATIONS_TO_ODATA,
            {} as Editor,
            '/path/to/project'
        );
        expect(writer instanceof AnnotationsWriter).toBe(true);
    });

    it('should throw an error for unsupported generator types', () => {
        expect(() => {
            WriterFactory.createWriter('UNSUPPORTED_TYPE' as GeneratorType, {} as Editor, '/path/to/project');
        }).toThrow('Unsupported generator type: UNSUPPORTED_TYPE');
    });
});
