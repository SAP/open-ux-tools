import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../../types';
import { DirName } from '@sap-ux/project-access';
import type { IWriter, DataSourceData } from '../../../types';
import { getChange, writeChangeToFolder } from '../../../base/change-utils';

/**
 * Handles the creation and writing of data source data changes for a project.
 */
export class DataSourceWriter implements IWriter<DataSourceData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs content for a data source change.
     *
     * @param {string} dataSourceId - The ID of the data source being modified.
     * @param {string} dataSourceUri - The new URI to update the data source with.
     * @param {number} [maxAge] - Optional maximum age.
     * @returns {object} The constructed content object for the change data source change.
     */
    private constructContent(dataSourceId: string, dataSourceUri: string, maxAge?: number): object {
        const content: {
            dataSourceId: string;
            entityPropertyChange: { propertyPath: string; operation: string; propertyValue: string | number }[];
        } = {
            dataSourceId: dataSourceId,
            entityPropertyChange: [
                {
                    propertyPath: 'uri',
                    operation: 'UPDATE',
                    propertyValue: dataSourceUri
                }
            ]
        };

        if (maxAge) {
            content.entityPropertyChange.push({
                propertyPath: 'settings/maxAge',
                operation: 'UPSERT',
                propertyValue: Number(maxAge)
            });
        }

        return content;
    }

    /**
     * Writes the change data source change to the project based on the provided data.
     *
     * @param {DataSourceData} data - The change data source data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: DataSourceData): Promise<void> {
        const { variant, dataSources, service } = data;
        const { id, uri, maxAge, annotationUri } = service;
        const annotationId = dataSources[id].settings?.annotations?.[0];

        const timestamp = Date.now();
        const content = this.constructContent(id, uri, maxAge);
        const change = getChange(variant, timestamp, content, ChangeType.CHANGE_DATA_SOURCE);

        writeChangeToFolder(
            this.projectPath,
            change,
            `id_${timestamp}_changeDataSource.change`,
            this.fs,
            DirName.Manifest
        );

        if (annotationId && annotationUri) {
            const annotationContent = this.constructContent(annotationId, annotationUri);
            const annotationTs = timestamp + 1;
            const annotationChange = getChange(variant, annotationTs, annotationContent, ChangeType.CHANGE_DATA_SOURCE);

            writeChangeToFolder(
                this.projectPath,
                annotationChange,
                `id_${annotationTs}_changeDataSource.change`,
                this.fs,
                DirName.Manifest
            );
        }
    }
}
