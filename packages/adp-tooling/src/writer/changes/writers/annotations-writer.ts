import path, { isAbsolute } from 'path';
import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../../types';
import { FlexLayer, type IWriter, type AnnotationsData } from '../../../types';
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
            annotation: { datasource, fileName }
        } = data;
        const annotationFileNameWithoutExtension = fileName?.toLocaleLowerCase().replace('.xml', '');
        const annotationNameSpace =
            layer === FlexLayer.CUSTOMER_BASE
                ? `customer.annotation.${annotationFileNameWithoutExtension}`
                : `annotation.${annotationFileNameWithoutExtension}`;
        return {
            dataSourceId: `${datasource}`,
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
    private getAnnotationFileName({ annotation }: AnnotationsData): string | undefined {
        return annotation.filePath ? path.basename(annotation.filePath) : `annotation_${Date.now()}.xml`;
    }

    /**
     * Writes the annotation change to the project based on the provided data.
     *
     * @param {AnnotationsData} data - The annotations data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: AnnotationsData): Promise<void> {
        const { variant, annotation } = data;
        annotation.fileName = annotation.fileName ?? this.getAnnotationFileName(data);
        if (annotation.filePath) {
            annotation.filePath = isAbsolute(annotation.filePath)
                ? annotation.filePath
                : path.join(this.projectPath, annotation.filePath);
        }
        const content = this.constructContent(data);
        const timestamp = Date.now();
        const change = getChange(variant, timestamp, content, ChangeType.ADD_ANNOTATIONS_TO_ODATA);
        writeAnnotationChange(this.projectPath, timestamp, annotation, change, this.fs);
    }
}
