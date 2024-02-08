import type { Editor } from 'mem-fs-editor';

import type { IWriterData, Writer } from '../../types';
import { GeneratorType } from '../../types';
import {
    AnnotationsWriter,
    ComponentUsagesWriter,
    NewModelWriter,
    DataSourceWriter,
    InboundWriter
} from './change-writers';

export class WriterFactory {
    private static writers = new Map<GeneratorType, Writer>([
        [GeneratorType.ADD_ANNOTATIONS_TO_ODATA, AnnotationsWriter],
        [GeneratorType.ADD_COMPONENT_USAGES, ComponentUsagesWriter],
        [GeneratorType.ADD_NEW_MODEL, NewModelWriter],
        [GeneratorType.CHANGE_DATA_SOURCE, DataSourceWriter],
        [GeneratorType.CHANGE_INBOUND, InboundWriter]
    ]);

    /**
     * Creates an instance of a writer based on the specified generator type.
     *
     * @param {T} type - The type of generator for which to create a writer.
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The path to the project for which the writer is created.
     * @returns {IWriterData<T>} An instance of the writer associated with the specified generator type.
     * @throws {Error} If the specified generator type is not supported.
     */
    static createWriter<T extends GeneratorType>(type: T, fs: Editor, projectPath: string): IWriterData<T> {
        const WriterClass = this.writers.get(type);
        if (!WriterClass) {
            throw new Error(`Unsupported generator type: ${type}`);
        }
        return new WriterClass(fs, projectPath);
    }
}
