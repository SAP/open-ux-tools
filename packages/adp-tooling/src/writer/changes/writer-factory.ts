import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../types';
import type { Writer, IWriterData } from '../../types';
import { AnnotationsWriter, ComponentUsagesWriter, NewModelWriter, DataSourceWriter, InboundWriter } from './writers';

/**
 * Handles the creation of a writer instance based on the generator type.
 */
export class WriterFactory {
    private static writers = new Map<ChangeType, Writer>([
        [ChangeType.ADD_ANNOTATIONS_TO_ODATA, AnnotationsWriter],
        [ChangeType.ADD_COMPONENT_USAGES, ComponentUsagesWriter],
        [ChangeType.ADD_LIBRARY_REFERENCE, ComponentUsagesWriter],
        [ChangeType.ADD_NEW_MODEL, NewModelWriter],
        [ChangeType.CHANGE_DATA_SOURCE, DataSourceWriter],
        [ChangeType.CHANGE_INBOUND, InboundWriter]
    ]);

    /**
     * Creates an instance of a writer based on the specified generator type.
     *
     * @param type - The type of the change which will be handled by the writer.
     * @param fs - The filesystem editor instance.
     * @param projectPath - The path to the project for which the writer is created.
     * @returns An instance of the writer associated with the specified generator type.
     * @throws If the specified generator type is not supported.
     */
    static createWriter<T extends ChangeType>(type: T, fs: Editor, projectPath: string): IWriterData<T> {
        const WriterClass = this.writers.get(type);
        if (!WriterClass) {
            throw new Error(`Unsupported generator type: ${type}`);
        }
        return new WriterClass(fs, projectPath);
    }
}
