import type { Editor } from 'mem-fs-editor';

import { ProjectType } from '../../types';
import type { Writer, IProjectWriterData } from '../../types';
import { OnPremWriter, S4Writer, CfWriter } from './writers';
/**
 * Handles the creation of a writer instance based on the project type.
 */
export class WriterFactory {
    private static writers = new Map<ProjectType, Writer>([
        [ProjectType.ON_PREM, OnPremWriter],
        [ProjectType.S4, S4Writer],
        [ProjectType.CF, CfWriter]
    ]);

    /**
     * Creates an instance of a writer based on the specified project type.
     *
     * @param {T} type - The type of the project which will be handled by the writer.
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The path to the project for which the writer is created.
     * @returns {IProjectWriterData<T>} An instance of the writer associated with the specified project type.
     * @throws {Error} If the specified project type is not supported.
     */
    static createWriter<T extends ProjectType>(type: T, fs: Editor, projectPath: string): IProjectWriterData<T> {
        const WriterClass = this.writers.get(type);
        if (!WriterClass) {
            throw new Error(`Unsupported project type: ${type}`);
        }
        return new WriterClass(fs, projectPath);
    }
}
