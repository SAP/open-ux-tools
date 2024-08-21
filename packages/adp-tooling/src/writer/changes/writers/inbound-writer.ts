import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../../types';
import { DirName } from '@sap-ux/project-access';
import {
    getParsedPropertyValue,
    findChangeWithInboundId,
    getChange,
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
        const { icon, title, subtitle } = data.flp;
        if (title) {
            content.entityPropertyChange.push({
                propertyPath: 'title',
                operation: 'UPSERT',
                propertyValue: getParsedPropertyValue(title)
            });
        }

        if (subtitle) {
            content.entityPropertyChange.push({
                propertyPath: 'subTitle',
                operation: 'UPSERT',
                propertyValue: getParsedPropertyValue(subtitle)
            });
        }

        if (icon) {
            content.entityPropertyChange.push({
                propertyPath: 'icon',
                operation: 'UPSERT',
                propertyValue: getParsedPropertyValue(icon)
            });
        }
    }
    /**
     * Writes the inbound data change to the project based on the provided data.
     *
     * @param {InboundData} data - The inbound data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: InboundData): Promise<void> {
        const { changeWithInboundId, filePath } = findChangeWithInboundId(this.projectPath, data.inboundId);
        const timestamp = Date.now();

        if (!changeWithInboundId) {
            const content = this.constructContent(data);
            const change = getChange(data.variant, timestamp, content, ChangeType.CHANGE_INBOUND);

            writeChangeToFolder(
                this.projectPath,
                change,
                `id_${timestamp}_changeInbound.change`,
                this.fs,
                DirName.Manifest
            );
        } else {
            if (changeWithInboundId.content) {
                this.getEnhancedContent(data, changeWithInboundId.content);
            }
            writeChangeToFile(filePath, changeWithInboundId, this.fs);
        }
    }
}
