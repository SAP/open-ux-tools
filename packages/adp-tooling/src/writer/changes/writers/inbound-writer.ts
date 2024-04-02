import type { Editor } from 'mem-fs-editor';

import { ChangeType, FolderTypes } from '../../../types';
import {
    getParsedPropertyValue,
    findChangeWithInboundId,
    getGenericChange,
    writeChangeToFolder,
    writeChangeToFile
} from '../../../base/change-utils';
import type { IWriter, InboundData, InboundContent } from '../../../types';

/**
 * Handles the creation and writing of inbound data changes for a project.
 */
export class InboundWriter implements IWriter<InboundData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an inbound data change based on provided data.
     *
     * @param {InboundData} data - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the inbound data change.
     */
    private constructContent(data: InboundData): object {
        const content: InboundContent = {
            inboundId: data.inboundId,
            entityPropertyChange: []
        };

        this.getEnhancedContent(data, content);

        return content;
    }

    /**
     * Enhances the provided content object based on the values provided in answers.
     *
     * @param {InboundData} data - An object containing potential values for title, subTitle, and icon.
     * @param {InboundContent} content - The initial content object to be enhanced.
     * @returns {void}
     */
    private getEnhancedContent(data: InboundData, content: InboundContent): void {
        const { icon, title, subTitle } = data.flp;
        if (title) {
            content.entityPropertyChange.push({
                propertyPath: 'title',
                operation: 'UPSERT',
                propertyValue: title
            });
        }

        if (subTitle) {
            content.entityPropertyChange.push({
                propertyPath: 'subTitle',
                operation: 'UPSERT',
                propertyValue: subTitle
            });
        }

        if (icon) {
            content.entityPropertyChange.push({
                propertyPath: 'icon',
                operation: 'UPSERT',
                propertyValue: icon
            });
        }
    }

    /**
     * Processes the provided answers object to parse its properties into the correct format.
     *
     * @param {InboundData} data - An object containing raw answers for inboundId, title, subTitle, and icon.
     * @returns {InboundData} A new answers object with properties modified
     *                           to ensure they are in the correct format for use in content construction.
     */
    private getModifiedData(data: InboundData): InboundData {
        const { title, subTitle, icon } = data.flp;

        return {
            ...data,
            flp: {
                title: getParsedPropertyValue(title),
                subTitle: getParsedPropertyValue(subTitle),
                icon: getParsedPropertyValue(icon)
            }
        };
    }

    /**
     * Writes the inbound data change to the project based on the provided data.
     *
     * @param {InboundData} data - The inbound data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: InboundData): Promise<void> {
        const answers = this.getModifiedData(data);
        const { changeWithInboundId, filePath } = findChangeWithInboundId(this.projectPath, answers.inboundId);

        if (!changeWithInboundId) {
            const content = this.constructContent(answers);
            const change = getGenericChange(data, content, ChangeType.CHANGE_INBOUND);

            writeChangeToFolder(
                this.projectPath,
                change,
                `id_${data.timestamp}_changeInbound.change`,
                this.fs,
                FolderTypes.MANIFEST
            );
        } else {
            if (changeWithInboundId.content) {
                this.getEnhancedContent(answers, changeWithInboundId.content);
            }
            writeChangeToFile(filePath, changeWithInboundId, this.fs);
        }
    }
}
