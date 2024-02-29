import type { Editor } from 'mem-fs-editor';

import { ChangeType, FolderTypes } from '../../../types';
import type { IWriter, NewModelData, DataSourceItem } from '../../../types';
import { parseStringToObject, getGenericChange, writeChangeToFolder } from '../../../base/change-utils';

/**
 * Handles the creation and writing of new sapui5 model data changes for a project.
 */
export class NewModelWriter implements IWriter<NewModelData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an new model change based on provided data.
     *
     * @param {NewModelData} data - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the new model change.
     */
    private constructContent(data: NewModelData): object {
        const content: {
            model: {
                [key: string]: {
                    settings?: object;
                    dataSource: string;
                };
            };
            dataSource: {
                [key: string]: DataSourceItem;
            };
        } = {
            dataSource: {
                [data.oDataServiceName]: {
                    uri: data.oDataServiceURI,
                    type: 'OData',
                    settings: {
                        odataVersion: data.oDataVersion
                    }
                }
            },
            model: {
                [data.oDataServiceModelName]: {
                    dataSource: data.oDataServiceName
                }
            }
        };

        if (data.oDataServiceModelSettings && data.oDataServiceModelSettings.length !== 0) {
            content.model[data.oDataServiceModelName].settings = parseStringToObject(data.oDataServiceModelSettings);
        }

        if (data.addAnnotationMode) {
            content.dataSource[data.oDataServiceName].settings.annotations = [`${data.oDataAnnotationDataSourceName}`];
            content.dataSource[data.oDataAnnotationDataSourceName] = {
                uri: data.oDataAnnotationDataSourceURI,
                type: 'ODataAnnotation'
            } as DataSourceItem;

            if (data.oDataAnnotationSettings && data.oDataAnnotationSettings.length !== 0) {
                content.dataSource[data.oDataAnnotationDataSourceName].settings = parseStringToObject(
                    data.oDataAnnotationSettings
                );
            }
        }

        return content;
    }

    /**
     * Writes the new model change to the project based on the provided data.
     *
     * @param {NewModelData} data - The new model data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: NewModelData): Promise<void> {
        const content = this.constructContent(data);
        const change = getGenericChange(data, content, ChangeType.ADD_NEW_MODEL);
        writeChangeToFolder(
            this.projectPath,
            change,
            `id_${data.timestamp}_addNewModel.change`,
            this.fs,
            FolderTypes.MANIFEST
        );
    }
}
