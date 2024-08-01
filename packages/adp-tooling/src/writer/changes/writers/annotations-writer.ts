import path, { isAbsolute } from 'path';
import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../../types';
import { UserState, type IWriter, type AnnotationsData } from '../../../types';
import { getChange, writeAnnotationChange } from '../../../base/change-utils';

/**
 * Handles the creation and writing of annotations data changes for a project.
 */
export class AnnotationsWriter implements IWriter<AnnotationsData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an annotation change based on provided data.
     *
     * @param {AnnotationsData} data - The data object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the annotation change.
     */
    private constructContent(data: AnnotationsData): object {
        const {
            variant: { layer },
            fileName,
            answers: { id }
        } = data;
        const annotationFileNameWithoutExtension = fileName?.toLocaleLowerCase().replace('.xml', '');
        const annotationNameSpace =
            layer === UserState.customer
                ? `customer.annotation.${annotationFileNameWithoutExtension}`
                : `annotation.${annotationFileNameWithoutExtension}`;
        return {
            dataSourceId: `${id}`,
            annotations: [annotationNameSpace],
            annotationsInsertPosition: 'END',
            dataSource: {
                [annotationNameSpace]: {
                    uri: `../annotations/${fileName}`,
                    type: 'ODataAnnotation'
                }
            }
        };
    }

    /**
     * Determines the appropriate filename for the annotation file based on user answers.
     *
     * @param {AnnotationsData} data - The answers object containing user choices.
     * @returns {string | undefined} The determined filename for the annotation file.
     */
    private getAnnotationFileName({ answers }: AnnotationsData): string | undefined {
        return answers.filePath ? path.basename(answers.filePath) : `annotation_${Date.now()}.xml`;
    }

    /**
     * Writes the annotation change to the project based on the provided data.
     *
     * @param {AnnotationsData} data - The annotations data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: AnnotationsData): Promise<void> {
        const { variant } = data;
        data.fileName = this.getAnnotationFileName(data);
        if (data.answers.filePath) {
            data.answers.filePath = isAbsolute(data.answers.filePath)
                ? data.answers.filePath
                : path.join(this.projectPath, data.answers.filePath);
        }
        const content = this.constructContent(data);
        const timestamp = Date.now();
        const change = getChange(variant, timestamp, content, ChangeType.ADD_ANNOTATIONS_TO_ODATA);
        writeAnnotationChange(this.projectPath, timestamp, data, change, this.fs);
    }
}
