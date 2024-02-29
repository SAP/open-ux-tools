import { sep } from 'path';
import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../../types';
import type { IWriter, AnnotationsData } from '../../../types';
import { getGenericChange, writeAnnotationChange } from '../../../base/change-utils';

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
        const { isInternalUsage, annotationFileName } = data;
        const annotationFileNameWithoutExtension = annotationFileName?.toLocaleLowerCase().replace('.xml', '');
        const annotationNameSpace = isInternalUsage
            ? `annotation.${annotationFileNameWithoutExtension}`
            : `customer.annotation.${annotationFileNameWithoutExtension}`;
        return {
            dataSourceId: `${data.oDataSource}`,
            annotations: [annotationNameSpace],
            annotationsInsertPosition: 'END',
            dataSource: {
                [annotationNameSpace]: {
                    uri: `../annotations/${annotationFileName}`,
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
    private getAnnotationFileName(data: AnnotationsData): string | undefined {
        return data.annotationFilePath ? data.annotationFilePath.split(sep).pop() : `annotation_${Date.now()}.xml`;
    }

    /**
     * Writes the annotation change to the project based on the provided data.
     *
     * @param {AnnotationsData} data - The annotations data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: AnnotationsData): Promise<void> {
        data.annotationFileName = this.getAnnotationFileName(data);
        const content = this.constructContent(data);
        const change = getGenericChange(data, content, ChangeType.ADD_ANNOTATIONS_TO_ODATA);
        writeAnnotationChange(this.projectPath, data, change, this.fs);
    }
}
